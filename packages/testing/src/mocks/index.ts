/**
 * @workspace/testing/mocks
 *
 * Mock factories for domain entities and DTOs. Use in tests to avoid
 * constructing full objects every time.
 */

import { asEntityId } from "@workspace/domain/shared";
import type { ProductListItemDTO, CustomerDTO, OrderListItemDTO } from "@workspace/contracts/dto";

export function createMockProduct(overrides: Partial<ProductListItemDTO> = {}): ProductListItemDTO {
  return {
    id: "prod_mock_001",
    sku: "MOCK-001",
    slug: "mock-product",
    title: "Mock Product",
    price: { amount: 1999, currency: "USD" },
    inStock: true,
    ...overrides
  };
}

export function createMockCustomer(overrides: Partial<CustomerDTO> = {}): CustomerDTO {
  return {
    id: "cust_mock_001",
    email: "mock@example.com",
    name: "Mock Customer",
    locale: "en",
    status: "active",
    addresses: [],
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

export function createMockOrder(overrides: Partial<OrderListItemDTO> = {}): OrderListItemDTO {
  return {
    id: asEntityId("order_mock_001"),
    number: "ORD-2026-000001",
    status: "paid",
    grandTotal: { amount: 4999, currency: "USD" },
    itemCount: 2,
    placedAt: new Date().toISOString(),
    ...overrides
  };
}
