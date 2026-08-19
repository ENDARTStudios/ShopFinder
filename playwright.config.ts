import { defineConfig, devices } from "@playwright/test";

/**
 * ShopFinder — Playwright E2E (docs/eng/TESTING.md)
 *
 * Jornadas críticas (#27):
 *   1. busca → produto → carrinho       (catalog-search-cart.spec.ts)
 *   2. comparar 2 produtos              (compare.spec.ts)
 *   3. login admin → pipeline           (admin-pipeline.spec.ts)
 *   4. checkout Stripe teste → webhook  (checkout-stripe.spec.ts — gated)
 *
 * Uso local:  bunx playwright test          (sobe o dev server sozinho)
 * CI:         job e2e (postgres service + seed + chromium)
 */
const PORT = process.env.TEST_PORT ?? "3000";
const baseURL = process.env.TEST_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // jornadas compartilham estado (carrinho/compare em localStorage)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "pt-BR"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bun run dev`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe"
  }
});
