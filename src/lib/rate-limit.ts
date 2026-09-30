/**
 * ShopFinder — Rate limiting (edge-safe)
 *
 * Sliding window REAL (log de timestamps por chave) em vez de janela fixa:
 * rajadas legítimas não são penalizadas duas vezes em janelas adjacentes e o
 * Retry-After é calculado a partir do pedido mais antigo ainda na janela.
 *
 * Backends:
 * - Upstash Redis REST (ZSET: ZADD + ZREMRANGEBYSCORE + ZCARD + PEXPIRE em
 *   pipeline) quando UPSTASH_REDIS_REST_URL/TOKEN estão configurados.
 * - Fallback em memória (por instância) para dev.
 *
 * Identificador: decidido pelo chamador (middleware) — userId da sessão
 * (getToken) quando presente, senão IP. Ver docs/eng/SECURITY.md.
 */

const WINDOW_MS_DEFAULT = 60_000;

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

// ── Sliding window em memória (fallback dev/por instância) ──

const memoryWindows = new Map<string, number[]>();

function prune(stamps: number[], now: number, windowMs: number): number[] {
  const floor = now - windowMs;
  let i = 0;
  while (i < stamps.length && stamps[i] <= floor) i++;
  return i > 0 ? stamps.slice(i) : stamps;
}

function memorySlidingWindow(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const kept = prune(memoryWindows.get(key) ?? [], now, windowMs);
  const count = kept.length;

  if (count >= limit) {
    const oldest = kept[0] ?? now;
    memoryWindows.set(key, kept);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    };
  }

  kept.push(now);
  memoryWindows.set(key, kept);

  // higiene: evita crescimento sem limite com chaves de IP descartáveis
  if (memoryWindows.size > 5000) {
    for (const [k, stamps] of memoryWindows) {
      if (prune(stamps, now, windowMs).length === 0) memoryWindows.delete(k);
    }
  }
  return { allowed: true, remaining: Math.max(0, limit - count - 1), retryAfterSeconds: 1 };
}

// ── Sliding window no Upstash Redis REST (ZSET) ─────────────

async function upstashPipeline(
  commands: Array<Array<string | number>>
): Promise<Array<{ result: number | string | null }> | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return null;
    return (await res.json()) as Array<{ result: number | string | null }>;
  } catch {
    return null; // degrada para memória — nunca bloquear por falha do limiter
  }
}

async function upstashSlidingWindow(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

  const pipeline = await upstashPipeline([
    ["ZADD", key, String(now), member],
    ["ZREMRANGEBYSCORE", key, "-inf", String(now - windowMs)],
    ["ZCARD", key],
    ["PEXPIRE", key, String(windowMs)]
  ]);
  if (!pipeline) return null;

  const count = Number(pipeline[2]?.result ?? 0);
  if (count <= limit) {
    return { allowed: true, remaining: Math.max(0, limit - count), retryAfterSeconds: 1 };
  }

  // Bloqueado: Retry-After preciso a partir do pedido mais antigo da janela
  const zr = await upstashPipeline([["ZRANGE", key, "0", "0", "WITHSCORES"]]);
  const oldest = Number(zr?.[0]?.result ?? now - windowMs);
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
  };
}

// ── API pública ─────────────────────────────────────────────

export async function checkRateLimit(
  routeKey: string,
  identifier: string
): Promise<RateLimitResult> {
  const rule = RATE_LIMIT_RULES[routeKey] ?? RATE_LIMIT_RULES.default;
  const windowMs = (rule.windowSeconds ?? 60) * 1000;
  const key = `${routeKey}:${identifier}`;

  const upstash = await upstashSlidingWindow(key, rule.limit, windowMs);
  if (upstash) return upstash;
  return memorySlidingWindow(key, rule.limit, windowMs);
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown"
  );
}
