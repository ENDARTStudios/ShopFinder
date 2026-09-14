/**
 * @workspace/testing/fixtures
 *
 * Static test fixtures. Populated as specific test scenarios demand them.
 */

export const FIXTURES = {
  productImage: "https://placehold.co/600x600/png",
  emptyCart: { items: [], currency: "USD", subtotal: { amount: 0, currency: "USD" } }
} as const;
