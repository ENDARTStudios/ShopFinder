# ADR-0009: Persistence Model

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The domain layer (ADR-0005) defines aggregates, entities, and value objects
in TypeScript. Before implementing persistence (Prisma schema, migrations,
repositories), we need a clear relational model that:

1. Maps cleanly to the domain aggregates.
2. Enforces data integrity (constraints, FKs, unique indexes).
3. Supports the persistence conventions (soft delete, audit, optimistic lock).
4. Handles multi-currency correctly (Money as BIGINT + CHAR(3), never DECIMAL).
5. Models the supplier-product relationship as Product → ProductOffer ← Supplier
   (not Product → Supplier), because a product can have 12 suppliers with
   different prices, inventory, and fulfillment windows.
6. Separates Inventory from Variant (multiple suppliers per variant).
7. Separates Product images and variants into their own tables.

The user explicitly recommended splitting 04 into:

- **04A** — Persistence Model (this ADR + `docs/persistence-model.md`).
- **04B** — Implementation (Prisma schema, migrations, repositories).

## Decision

Adopt the relational model documented in `docs/persistence-model.md`. Key
decisions:

### 1. Conventions (every table)

| Convention      | Implementation                                                               |
| --------------- | ---------------------------------------------------------------------------- |
| Soft delete     | `deleted_at TIMESTAMPTZ NULL`; queries default to `WHERE deleted_at IS NULL` |
| Audit           | `created_at`, `updated_at`, `created_by`, `updated_by`                       |
| Optimistic lock | `version INTEGER NOT NULL DEFAULT 1`; UPDATE checks `WHERE version = ?`      |
| Money           | `amount_in_minor_units BIGINT` + `currency CHAR(3)`; never DECIMAL           |
| IDs             | cuid (VARCHAR(30)); branded in domain (ProductId, OrderId, ...)              |
| Timestamps      | TIMESTAMPTZ, stored in UTC                                                   |

### 2. Table structure (28 tables across 7 contexts)

- **Catalog (8)**: categories, products, variants, variant_options,
  variant_values, variant_attribute_values, product_media, product_attributes, inventory
- **Customer (3)**: customers, customer_addresses, wishlist_items
- **Cart (2)**: carts, cart_items
- **Checkout (1)**: checkout_sessions
- **Order (3)**: orders, order_items, order_fulfillments
- **Payment (3)**: payments, payment_transactions, payment_refunds
- **Supplier (4)**: suppliers, supplier_integrations, product_offers,
  supplier_orders, supplier_order_items

### 3. ProductOffer — the multi-supplier differentiator (Rec 10)

Never `Product → Supplier`. Instead:

```
Product 1───N ProductOffer N───1 Supplier
                │
                └── price, inventory, fulfillment_days, ships_from_country
```

A single Product can have 12 offers from 12 suppliers. The platform picks the
best offer per order (cheapest, fastest, or per rule). This is a core
differentiator for a dropshipping platform.

### 4. Inventory separation (Rec 9)

Inventory is a separate aggregate (`inventory` table), not a column on
`variants`. Reasons:

- A variant can have inventory from multiple suppliers (multiple offers).
- Inventory has states: `available`, `reserved` (in carts), `committed` (in orders).
- Inventory syncs from suppliers independently of product edits.

### 5. Normalized variant attributes (Rec 8)

Variants use a normalized schema:

- `variant_options` (e.g. "Color", "Size")
- `variant_values` (e.g. "Red", "XL")
- `variant_attribute_values` (join: variant ↔ value)

This enables faceted search and avoids duplicate strings.

### 6. Repository ↔ Query Service separation (Rec 2)

- **Repository** → commands (save, delete) + aggregate reconstitution.
  Returns domain aggregates.
- **QueryService** → reads (list, search, count, projections).
  Returns DTOs from `@workspace/contracts/dto`.

This is a lightweight CQRS: same database, separate interfaces. Future upgrade
to a dedicated read store (materialized view, search index) is mechanical.

## Consequences

**Positive**

- Prisma schema (04B) is a mechanical translation — no design decisions left.
- Multi-supplier support is built-in from day 1.
- Soft delete + audit + version are universal — no migration debt later.
- Money as BIGINT avoids floating-point errors and supports 0-decimal currencies.
- Repository/Query separation enables read-side optimization without touching
  write-side logic.

**Negative**

- 28 tables is more than a naive schema (e.g. Product with embedded variants).
  Justified: the complexity reflects the domain.
- Normalized variant attributes require joins to reconstruct. Mitigated by
  Query Services that denormalize for list views.
- `version` column adds a small write overhead. Acceptable for integrity.

## Alternatives Considered

- **Single-table Product with JSONB variants** — rejected: prevents indexing,
  faceted search, and per-variant queries.
- **DECIMAL for Money** — rejected: floating-point rounding errors; some
  currencies have 0 decimals; BIGINT is exact.
- **Hard delete** — rejected: lose audit trail; can't restore; FK integrity
  issues.
- **Product → Supplier direct FK** — rejected: prevents multi-supplier, the
  core differentiator of a dropshipping platform.
- **CQRS with separate write/read databases** — deferred: YAGNI for the
  monolith phase. Repository/Query separation keeps the upgrade path open.

## References

- ADR-0005 (Domain Architecture — aggregates define the model)
- `docs/persistence-model.md` (full table catalog + ER diagram)
- ADR-0010 (Unit of Work — transaction abstraction)
- ADR-0011 (Query/Command Separation)
