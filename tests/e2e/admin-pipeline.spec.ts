import { test, expect } from "@playwright/test";

/**
 * Jornada 3 — login admin → pipeline (#27)
 *
 * Fluxo: /login → credenciais admin (criadas no CI via scripts/create-admin.ts)
 * → dashboard do operador → /admin/pipeline com cards de conectores.
 *
 * Requer E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD; sem eles a jornada é pulada.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD não configurados");

test.describe("jornada: login admin → pipeline", () => {
  test("login leva ao dashboard e ao status do pipeline", async ({ page }) => {
    await page.goto("/login");

    await page.locator("input[type='email']").fill(ADMIN_EMAIL!);
    await page.locator("input[type='password']").fill(ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Entrar" }).click();

    // Dashboard do operador
    await expect(page.getByRole("heading", { name: /Dashboard do Operador/i })).toBeVisible({
      timeout: 30_000
    });

    // Pipeline status
    await page.getByRole("link", { name: "Pipeline" }).click();
    await expect(page.getByRole("heading", { name: /Pipeline Status/i })).toBeVisible({
      timeout: 30_000
    });
    await expect(page.getByText("Connectors").first()).toBeVisible();
  });
});
