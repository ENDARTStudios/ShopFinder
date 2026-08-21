import { test, expect } from "@playwright/test";

/**
 * Jornada 1 — busca → produto → carrinho (#27)
 *
 * Fluxo: landing → busca no hero (termo extraído do primeiro card — o seed
 * do CI não garante marcas específicas) → resultados → página de produto →
 * adicionar ao carrinho → drawer do carrinho com o item.
 */
test.describe("jornada: busca → produto → carrinho", () => {
  test("busca pelo hero leva à página de produto e adiciona ao carrinho", async ({ page }) => {
    await page.goto("/");

    // Landing carrega com o grid de produtos populado (seed)
    const productsSection = page.locator("section#produtos");
    await expect(productsSection).toBeVisible();
    const firstCard = productsSection.locator("a[href^='/produtos/']").first();
    await expect(firstCard).toBeVisible({ timeout: 60_000 });

    // Termo de busca determinístico: título do primeiro produto
    const firstTitle = (await firstCard.locator("h3").first().textContent())?.trim() ?? "";
    const searchTerm = (firstTitle.split(/\s+/).find((w) => w.length >= 4) ?? firstTitle).slice(
      0,
      20
    );
    expect(searchTerm.length).toBeGreaterThan(0);

    // Busca pelo hero e submete
    const searchInput = page.getByPlaceholder("Pesquisar produtos, MPN, marcas...");
    await searchInput.fill(searchTerm);
    await searchInput.press("Enter");

    // Resultados filtrados continuam no grid (dev server compila a rota no CI)
    await expect(productsSection.locator("a[href^='/produtos/']").first()).toBeVisible({
      timeout: 60_000
    });

    // Abre a página do primeiro produto
    await productsSection.locator("a[href^='/produtos/']").first().click();
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 60_000 });
    const productTitle = (await page.locator("h1").first().textContent())?.trim() ?? "";
    expect(productTitle.length).toBeGreaterThan(0);

    // Adiciona ao carrinho
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).first().click();

    // O drawer do carrinho monta no header da landing — volta e abre.
    // O CartProvider persiste os itens entre rotas; o botão "Remover item"
    // (aria-label) só existe no drawer quando há pelo menos um item.
    await page.goBack();
    await page.getByRole("button", { name: "Carrinho" }).first().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Remover item" }).first()).toBeVisible({
      timeout: 15_000
    });
  });
});
