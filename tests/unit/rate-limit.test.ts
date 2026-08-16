/**
 * Testes unitários do rate limiter (fallback em memória).
 * Issues #28 — docs/eng/TESTING.md.
 */
import { describe, expect, test, beforeEach } from "bun:test";

// Forçar fallback em memória mesmo com .env configurado (bun auto-carrega .env)
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const { checkRateLimit, getClientIp, RATE_LIMIT_RULES } = await import(
  "../../src/lib/rate-limit"
);

describe("rate-limit (memória)", () => {
  test("bloqueia após exceder o limite de /api/auth (5/min)", async () => {
    const key = `test-auth-${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit("/api/auth", key);
      expect(r.allowed).toBe(true);
    }
    const sixth = await checkRateLimit("/api/auth", key);
    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
  });

  test("identificadores diferentes têm buckets independentes", async () => {
    const a = await checkRateLimit("/api/auth", `ip-a-${crypto.randomUUID()}`);
    const b = await checkRateLimit("/api/auth", `ip-b-${crypto.randomUUID()}`);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  test("rota sem regra usa limite default (120/min)", async () => {
    expect(RATE_LIMIT_RULES.default.limit).toBe(120);
    const r = await checkRateLimit("/api/unknown", `x-${crypto.randomUUID()}`);
    expect(r.allowed).toBe(true);
  });

  test("getClientIp extrai o primeiro IP do x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" });
    expect(getClientIp(headers)).toBe("203.0.113.5");
  });

  test("getClientIp usa x-real-ip quando forwarded ausente", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.7" });
    expect(getClientIp(headers)).toBe("198.51.100.7");
  });
});
