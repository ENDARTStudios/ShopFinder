/**
 * Sprint 13 — Pipeline Status API integration tests (REC-005).
 *
 * 5 testes:
 *   1. Endpoint retorna 401 sem autenticação.
 *   2. Endpoint retorna 200 com admin auth.
 *   3. Resposta contém array `connectors` com eBay.
 *   4. Resposta contém array `executions`.
 *   5. `stats` tem campos esperados.
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeAll } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@workspace/auth";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const prisma = new PrismaClient();

// Helper: login as admin and return cookie header
// Cache module-level apenas em sucesso: /api/auth tem rate limit de
// tentativas por IP e logins repetidos por teste estouram o limite.
let cachedAdminCookies: string | null = null;

async function adminCookies(): Promise<string> {
  if (cachedAdminCookies) return cachedAdminCookies;
  function extractCookies(res: Response): string[] {
    const arr = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.();
    return arr && arr.length > 0 ? arr : (res.headers.get("set-cookie") ?? "").split(", ");
  }
  function toCookieHeader(cookies: string[]): string {
    return cookies
      .map((c) => c.split(";")[0]?.trim())
      .filter(Boolean)
      .join("; ");
  }

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = toCookieHeader(extractCookies(csrfRes));

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: csrfCookies },
    body: new URLSearchParams({
      email: "test-admin@shopfinder.test",
      password: "testAdminPass123",
      csrfToken: csrfData.csrfToken,
      redirect: "false"
    }),
    redirect: "manual"
  });
  const sessionCookies = toCookieHeader(extractCookies(loginRes));
  const cookies = `${csrfCookies}; ${sessionCookies}`;
  // Só cacheia sessão válida — um login fracassado não pode envenenar
  // os testes seguintes.
  if (sessionCookies.includes("next-auth.session-token")) {
    cachedAdminCookies = cookies;
  }
  return cookies;
}

describe("Pipeline Status API", () => {
  // Ordem de execução de arquivos não é garantida entre versões do bun:
  // o admin de teste é criado aqui, sem depender do admin-api.test.ts.
  beforeAll(async () => {
    const passwordHash = await hashPassword("testAdminPass123");
    await prisma.user.upsert({
      where: { email: "test-admin@shopfinder.test" },
      update: { passwordHash, roles: JSON.stringify(["admin"]), status: "active" },
      create: {
        email: "test-admin@shopfinder.test",
        passwordHash,
        roles: JSON.stringify(["admin"]),
        storeId: "cmrfu2kdb0000oybnlekztroj",
        status: "active"
      }
    });
  });

  it("should return 401 without authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/pipeline/status`);
    expect(res.status).toBe(401);
  });

  it("should return 200 with admin auth", async () => {
    const cookies = await adminCookies();
    const res = await fetch(`${BASE_URL}/api/admin/pipeline/status`, {
      headers: { Cookie: cookies }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("connectors");
    expect(data).toHaveProperty("executions");
    expect(data).toHaveProperty("stats");
  });

  it("should contain connectors array with eBay", async () => {
    const cookies = await adminCookies();
    const res = await fetch(`${BASE_URL}/api/admin/pipeline/status`, {
      headers: { Cookie: cookies }
    });
    const data = await res.json();
    expect(Array.isArray(data.connectors)).toBe(true);
    const ebay = data.connectors.find((c: { code: string }) => c.code === "ebay");
    expect(ebay).toBeDefined();
    expect(ebay.mode).toMatch(/^(replay|live|not_configured)$/);
  });

  it("should contain executions array", async () => {
    const cookies = await adminCookies();
    const res = await fetch(`${BASE_URL}/api/admin/pipeline/status`, {
      headers: { Cookie: cookies }
    });
    const data = await res.json();
    expect(Array.isArray(data.executions)).toBe(true);
    // After running the pipeline, there should be at least 1 execution
    if (data.executions.length > 0) {
      const first = data.executions[0];
      expect(first).toHaveProperty("status");
      expect(first).toHaveProperty("startedAt");
      expect(first).toHaveProperty("durationMs");
      expect(first).toHaveProperty("itemsProcessed");
    }
  });

  it("should have stats with expected fields", async () => {
    const cookies = await adminCookies();
    const res = await fetch(`${BASE_URL}/api/admin/pipeline/status`, {
      headers: { Cookie: cookies }
    });
    const data = await res.json();
    expect(data.stats).toHaveProperty("totalExecutions");
    expect(data.stats).toHaveProperty("successfulRuns");
    expect(data.stats).toHaveProperty("failedRuns");
    expect(data.stats).toHaveProperty("avgDurationMs");
    expect(data.stats).toHaveProperty("successRate");
    expect(typeof data.stats.successRate).toBe("number");
    expect(data.stats.successRate).toBeGreaterThanOrEqual(0);
    expect(data.stats.successRate).toBeLessThanOrEqual(1);
  });
});
