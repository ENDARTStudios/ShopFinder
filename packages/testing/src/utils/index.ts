/**
 * @workspace/testing/utils
 *
 * Test helpers. The React render helper wraps components with all the
 * providers they need (ThemeProvider, QueryClient, etc.) so tests don't
 * have to repeat the boilerplate.
 */

export async function waitFor<T>(fn: () => T | Promise<T>, timeoutMs = 5000): Promise<T> {
  const start = Date.now();
  while (true) {
    try {
      return await fn();
    } catch (e) {
      if (Date.now() - start > timeoutMs) throw e;
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

// Placeholder — real implementation added when item 23 (Testes) lands.
// Will wrap with ThemeProvider + QueryClientProvider + next-intl.
export function renderWithProviders(ui: React.ReactNode): { container: HTMLElement } {
  const container = document.createElement("div");
  container.appendChild(ui as unknown as Node);
  return { container };
}
