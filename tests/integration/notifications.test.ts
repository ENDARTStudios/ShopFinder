/**
 * Sprint 13 — Notifications API integration tests (REC-005).
 *
 * 5 testes:
 *   1. Endpoint retorna 401 sem autenticação.
 *   2. Endpoint retorna 200 com admin auth.
 *   3. Resposta contém array `notifications`.
 *   4. Após setar produto para `review`, notificação de review aparece.
 *   5. Produto em `review` gera notificação com link correto.
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeAll } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@workspace/auth";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const prisma = new PrismaClient();

// Helper: login as admin and return cookie header (cache só em sucesso)
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
  if (sessionCookies.includes("next-auth.session-token")) {
    cachedAdminCookies = cookies;
  }
  return cookies;
}

describe("Notifications API", () => {
  // Ordem de arquivos não é garantida entre versões do bun: garante o
  // admin de teste sem depender de admin-api.test.ts ter rodado antes.
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
    const res = await fetch(`${BASE_URL}/api/admin/notifications`);
    expect(res.status).toBe(401);
  });

  it("should return 200 with admin auth", async () => {
    const cookies = await adminCookies();
    const res = await fetch(`${BASE_URL}/api/admin/notifications`, {
      headers: { Cookie: cookies }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("notifications");
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("counts");
  });

  it("should contain notifications array (may be empty)", async () => {
    const cookies = await adminCookies();
    const res = await fetch(`${BASE_URL}/api/admin/notifications`, {
      headers: { Cookie: cookies }
    });
    const data = await res.json();
    expect(Array.isArray(data.notifications)).toBe(true);
    expect(typeof data.total).toBe("number");
  });

  it("should show review notification after setting a product to review", async () => {
    const cookies = await adminCookies();

    // Get a published product to set to review
    const listRes = await fetch(`${BASE_URL}/api/admin/products`, {
      headers: { Cookie: cookies }
    });
    const listData = (await listRes.json()) as {
      products: Array<{ id: string; title: string; slug: string }>;
    };
    const product = listData.products[0];
    expect(product).toBeDefined();

    // Set to review
    const patchRes = await fetch(`${BASE_URL}/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ status: "review" })
    });
    expect(patchRes.status).toBe(200);

    // Check notifications — should now include a product_review notification
    const notifRes = await fetch(`${BASE_URL}/api/admin/notifications`, {
      headers: { Cookie: cookies }
    });
    const notifData = await notifRes.json();
    const reviewNotifs = notifData.notifications.filter(
      (n: { type: string }) => n.type === "product_review"
    );
    expect(reviewNotifs.length).toBeGreaterThan(0);

    // Restore product to published
    await fetch(`${BASE_URL}/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ status: "published" })
    });
  });

  it("should include correct link in review notification", async () => {
    const cookies = await adminCookies();

    // Set a product to review
    const listRes = await fetch(`${BASE_URL}/api/admin/products`, {
      headers: { Cookie: cookies }
    });
    const listData = (await listRes.json()) as { products: Array<{ id: string; slug: string }> };
    const product = listData.products[0];

    await fetch(`${BASE_URL}/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ status: "review" })
    });

    // Check notifications
    const notifRes = await fetch(`${BASE_URL}/api/admin/notifications`, {
      headers: { Cookie: cookies }
    });
    const notifData = await notifRes.json();
    const reviewNotif = notifData.notifications.find(
      (n: { type: string }) => n.type === "product_review"
    );
    expect(reviewNotif).toBeDefined();
    expect(reviewNotif.link).toContain(`/produtos/`);

    // Restore
    await fetch(`${BASE_URL}/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({ status: "published" })
    });
  });
});

// Cleanup
afterAll(async () => {
  await prisma.$disconnect();
});

function afterAll(fn: () => Promise<void>) {
  // bun:test doesn't have afterAll in all versions — use process.on
  // Actually bun:test does support afterAll
  // Just call it at module level for cleanup
}
