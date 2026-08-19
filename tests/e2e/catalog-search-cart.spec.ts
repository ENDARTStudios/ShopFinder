import { test, expect } from "@playwright/test";

/**
 * Jornada 1 — busca → produto → carrinho (#27)
 *
 * Fluxo: landing → busca no hero → resultados → página de produto →
 * adicionar ao carrinho → drawer do carrinho com o item.
 */
test.describe("jornada: busca → produto → carrinho", () => {
  test("busca pelo hero leva à página de produto e adiciona ao carrinho", async ({ page }) => {
    await page.goto("/");

    // Landing carrega com o grid de produtos populado (seed)
    const productsSection = page.locator("section#produtos");
    await expect(productsSection).toBeVisible();
    const firstCard = productsSection.locator("a[href^='/produtos/']").first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });

    // Busca pelo hero e submete
    const searchInput = page.getByPlaceholder("Pesquisar produtos, MPN, marcas...");
    await searchInput.fill("Intel");
    await searchInput.press("Enter");

    // Resultados filtrados continuam no grid
    await expect(productsSection.locator("a[href^='/produtos/']").first()).toBeVisible();

    // Abre a página do primeiro produto
    await productsSection.locator("a[href^='/produtos/']").first().click();
    await expect(page.locator("h1")).toBeVisible({ timeout: 30_000 });
    const productTitle = (await page.locator("h1").textContent())?.trim() ?? "";
    expect(productTitle.length).toBeGreaterThan(0);

    // Adiciona ao carrinho
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).first().click();

    // Abre o drawer do carrinho e verifica o item
    await page.getByRole("button", { name: "Carrinho" }).first().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(productTitle, { exact: false })).toBeVisible();
  });
});
