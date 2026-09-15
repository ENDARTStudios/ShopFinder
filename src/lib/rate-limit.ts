/**
 * ShopFinder — Rate limiting (edge-safe)
 *
 * Sliding window no Upstash Redis REST quando configurado; fallback em memória
 * (por instância) para dev. Ver docs/eng/SECURITY.md para os limites por rota.
 */

const WINDOW_SECONDS = 60;

export interface RateLimitRule {
  limit: number;
  windowSeconds?: number;
}

export const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
  // Limite apertado somente nas rotas de CREDENCIAL (tentativas de senha).
  // Endpoints auxiliares de auth (csrf, session) caem no default — sem isso,
  // fluxos legítimos que fazem GET /api/auth/csrf queimam o budget de 5/min
  // (docs/eng/SECURITY.md §2).
  "/api/auth/callback/credentials": { limit: 5 },
  "/api/auth/register": { limit: 5 },
  "/api/waitlist": { limit: 5 },
  "/api/catalog": { limit: 60 },
  "/api/public/v1/products": { limit: 30 },
  "/api/checkout-session": { limit: 10 },
  "/api/webhook": { limit: 300 },
  default: { limit: 120 }
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Fallback em memória — só protege a instância atual (dev). */
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitMemory(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: windowSeconds };
  }
  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  return {
    allowed: bucket.count <= limit,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

async function rateLimitUpstash(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const redisKey = `ratelimit:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSeconds)]
      ]),
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ result: number }>;
    const count = data[0]?.result ?? 0;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: windowSeconds
    };
  } catch {
    return null; // degrada para memória — nunca bloquear por falha do limiter
  }
}

export async function checkRateLimit(
  routeKey: string,
  identifier: string
): Promise<RateLimitResult> {
  const rule = RATE_LIMIT_RULES[routeKey] ?? RATE_LIMIT_RULES.default;
  const windowSeconds = rule.windowSeconds ?? WINDOW_SECONDS;
  const key = `${routeKey}:${identifier}`;

  const upstash = await rateLimitUpstash(key, rule.limit, windowSeconds);
  if (upstash) return upstash;
  return rateLimitMemory(key, rule.limit, windowSeconds);
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown"
  );
}
