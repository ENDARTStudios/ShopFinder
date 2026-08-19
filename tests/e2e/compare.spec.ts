import { test, expect } from "@playwright/test";

/**
 * Jornada 2 — comparar 2 produtos (#27)
 *
 * Fluxo: dois produtos consecutivos → botão "Comparar" em cada →
 * navega para /compare → tabela com 2 colunas de produto.
 */
test.describe("jornada: comparar 2 produtos", () => {
  test("adiciona 2 produtos e exibe a tabela de comparação", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator("section#produtos a[href^='/produtos/']");
    await expect(cards.nth(1)).toBeVisible({ timeout: 30_000 });

    // Adiciona os dois primeiros produtos ao comparador via botão no card
    await cards.nth(0).getByRole("button", { name: "Comparar" }).click();
    await cards.nth(1).getByRole("button", { name: "Comparar" }).click();

    // Vai para a página de comparação via link do header
    await page.getByRole("link", { name: "Comparar" }).first().click();
    await expect(page).toHaveURL(/\/compare/);

    // Tabela de especificações com as duas colunas de produto
    await expect(page.getByRole("heading", { name: "Comparar Produtos" })).toBeVisible();
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 30_000 });
    const headerCells = table.locator("thead th");
    await expect(headerCells).toHaveCount(3); // atributo + 2 produtos
  });
});
