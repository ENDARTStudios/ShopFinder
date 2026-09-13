/**
 * ShopFinder — Redis (Upstash REST) health check
 *
 * Usa a REST API via fetch, no mesmo padrão de src/lib/rate-limit.ts:
 * sem SDK (@upstash/redis não é dependência), degrada graciosamente
 * quando não configurado. Ver docs/eng/OBSERVABILITY.md.
 */

export interface RedisHealth {
  status: "ok" | "degraded" | "not_configured";
  latencyMs?: number;
}

/** Timeout máximo do ping — acima disso considera degraded. */
const PING_TIMEOUT_MS = 1500;

export async function checkRedisHealth(): Promise<RedisHealth> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return { status: "not_configured" };
  }

  try {
    const start = Date.now();
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(PING_TIMEOUT_MS)
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return { status: "degraded" };
    }
    return { status: "ok", latencyMs };
  } catch {
    return { status: "degraded" };
  }
}
