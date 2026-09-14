/**
 * @workspace/testing
 *
 * Shared test infrastructure. Import from test files:
 *   import { render, createMockProduct } from "@workspace/testing";
 *
 * Subpaths:
 *   - ./utils    : render helpers, async utilities
 *   - ./mocks    : mock factories for domain entities & DTOs
 *   - ./fixtures : static test fixtures (JSON, images, etc.)
 */

export { renderWithProviders, waitFor } from "./utils";
export { createMockProduct, createMockCustomer, createMockOrder } from "./mocks";
