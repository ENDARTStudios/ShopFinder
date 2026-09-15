import { test, expect } from "@playwright/test";

/**
 * Jornada 4 — checkout Stripe (modo teste) → pedido (#27)
 *
 * Fluxo: produto → carrinho → /checkout → pagamento com cartão de teste
 * do Stripe → página de sucesso. A gravação do pedido pelo webhook é
 * validada pelos testes de integração (T023) — aqui o corte E2E termina
 * no retorno do Stripe.
 *
 * Requer chaves de teste (STRIPE) e E2E_CHECKOUT_ENABLED=1 — roda apenas
 * contra ambiente de staging/dev configurado, nunca no CI unitário.
 */
test.skip(process.env.E2E_CHECKOUT_ENABLED !== "1", "E2E_CHECKOUT_ENABLED não configurado");

const STRIPE_TEST_CARD = "4242424242424242";

test.describe("jornada: checkout Stripe teste", () => {
  test("compra com cartão de teste termina na página de sucesso", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator("section#produtos a[href^='/produtos/']");
    await expect(cards.nth(1)).toBeVisible({ timeout: 30_000 });

    // Produto → carrinho
    await cards.nth(0).click();
    await expect(page.locator("h1")).toBeVisible();
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).first().click();

    // Carrinho → checkout
    await page.getByRole("button", { name: "Carrinho" }).first().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: /Finalizar compra/i }).click();

    // Página de checkout do ShopFinder → botão de pagamento redireciona ao Stripe
    await expect(page).toHaveURL(/\/checkout/, { timeout: 30_000 });
    await page.getByRole("button", { name: /pagar|pay|finalizar/i }).click();

    // Stripe Checkout (hosted) — cartão de teste
    await expect(page).toHaveURL(/stripe|checkout\.stripe/i, { timeout: 60_000 });
    await page.locator("input[name='cardNumber']").fill(STRIPE_TEST_CARD);
    await page.locator("input[name='cardExpiry']").fill("12/34");
    await page.locator("input[name='cardCvc']").fill("123");
    await page.locator("input[name='billingName']").fill("E2E Test");
    await page.getByRole("button", { name: /pay|pagar/i }).click();

    // Retorno à página de sucesso do ShopFinder
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 60_000 });
  });
});
