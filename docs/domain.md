# Domain Architecture

> Bounded Contexts, aggregates, events, and ubiquitous language for the
> Dropshipping Platform. See `adr/0005-domain-architecture.md` for the
> rationale behind these choices.

## 1. Bounded Contexts

| Context   | Package                      | Responsibility                                              | Aggregate Roots         |
| --------- | ---------------------------- | ----------------------------------------------------------- | ----------------------- |
| Shared    | `@workspace/domain/shared`   | Base primitives: EntityId, Money, Address, Email, events    | (none — pure types)     |
| Catalog   | `@workspace/domain/catalog`  | Product definition, variants, categories, attributes, media | Product, Category       |
| Customer  | `@workspace/domain/customer` | Customer identity, profile, addresses, wishlist             | Customer                |
| Cart      | `@workspace/domain/cart`     | Shopping cart lifecycle — items, quantities                 | Cart                    |
| Checkout  | `@workspace/domain/checkout` | Order-placement flow — addresses, shipping, payment intent  | CheckoutSession         |
| Orders    | `@workspace/domain/order`    | Placed orders, line items, fulfillment, tracking            | Order                   |
| Payments  | `@workspace/domain/payment`  | Payment intents, transactions, captures, refunds            | Payment                 |
| Suppliers | `@workspace/domain/supplier` | Supplier identity, product mapping, fulfillment orders      | Supplier, SupplierOrder |

## 2. Context Map

```
                    ┌──────────┐
                    │ Catalog  │
                    └────┬─────┘
                         │ (read: product price/stock)
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │   Cart   │  │ Customer │  │ Supplier │
    └────┬─────┘  └────┬─────┘  └────┬─────┘
         │              │              │
         │ (consumes)   │ (owns)       │ (fulfills)
         ▼              │              │
    ┌──────────┐        │              │
    │ Checkout │◄───────┘              │
    └────┬─────┘                       │
         │ (produces Order)            │
         ▼                             │
    ┌──────────┐───────(consumes)──────┘
    │  Order   │
    └────┬─────┘
         │ (triggers)
         ▼
    ┌──────────┐
    │ Payment  │
    └────┬─────┘
         │ (PaymentCaptured → OrderPaid)
         ▼
    ┌──────────┐
    │  Order   │──(fulfillment)──►┌──────────┐
    └──────────┘                  │ Supplier │
                                  └──────────┘
```

**Relationship types:**

- **Customer → Cart**: Customer owns cart (1:N). Anonymous carts key on session ID.
- **Cart → Checkout**: Checkout consumes Cart (read-only). Cart is marked "converted" after checkout.
- **Checkout → Order**: Checkout produces Order. CheckoutSession is transient (discarded after conversion).
- **Order → Payment**: Order triggers Payment. Payment emits `PaymentCaptured` → Order listens → emits `OrderPaid`.
- **Order → Supplier**: Order is split into SupplierOrders (one per supplier). Supplier emits `SupplierOrderShipped` → Order listens → emits `OrderShipped`.
- **Catalog → (everyone)**: Catalog is the upstream context. All other contexts read product data from it. No other context writes to Catalog.

## 3. Aggregates Detail

### Catalog

**Product (aggregate root)**

- Identity: `EntityId`
- State: sku, slug, title, description, status (draft|published|archived), basePrice, categoryId, variants[], attributes[], media[], tags[]
- Invariants:
  - A product must have at least one variant to be published.
  - SKU is unique across the catalog.
  - Slug is unique across the catalog.
  - basePrice currency must match all variant price currencies.

**Category (aggregate root)**

- Identity: `EntityId`
- State: slug, name, parentId (tree), description
- Invariants: slug unique; no cyclic parent references.

### Customer

**Customer (aggregate root)**

- Identity: `EntityId`
- State: email, name, locale, status, addresses[], wishlist
- Invariants: email unique; at most one default address.

### Cart

**Cart (aggregate root)**

- Identity: `EntityId`
- State: customerId?, sessionId, currency, items[], status
- Invariants: all item prices in cart currency; max 99 of any single product.

### Checkout

**CheckoutSession (aggregate root)**

- Identity: `EntityId`
- State: cartId, customerId?, currency, shippingAddress?, billingAddress?, shippingMethod?, status
- Invariants: cannot complete without shipping + billing + method; status transitions are one-way.

### Orders

**Order (aggregate root)**

- Identity: `EntityId`
- State: number, customerId, currency, items[], totals, addresses, status, fulfillments[]
- Invariants: grandTotal = subtotal + shipping + tax - discount; status transitions follow state machine; cannot cancel after shipped.

### Payments

**Payment (aggregate root)**

- Identity: `EntityId`
- State: orderId, currency, amount, method, status, transactions[], refunds[]
- Invariants: refund total ≤ captured amount; status transitions follow state machine.

### Suppliers

**Supplier (aggregate root)**

- Identity: `EntityId`
- State: code, name, integration, defaultCurrency, shipsFromCountry, status
- Invariants: code is unique (one integration per supplier).

**SupplierOrder (aggregate root)**

- Identity: `EntityId`
- State: supplierId, orderId, supplierOrderRef?, items[], totalCost, status, tracking?
- Invariants: status transitions follow state machine.

## 4. Domain Events Catalog

| Event Type                      | Emitted By | Consumed By           |
| ------------------------------- | ---------- | --------------------- |
| `catalog.product.created`       | Catalog    | Search, Analytics     |
| `catalog.product.published`     | Catalog    | Search, SEO           |
| `catalog.product.price_changed` | Catalog    | Search, Marketing     |
| `customer.registered`           | Customer   | Marketing, Analytics  |
| `cart.abandoned`                | Cart       | Marketing             |
| `checkout.completed`            | Checkout   | Orders, Analytics     |
| `order.placed`                  | Orders     | Payments, Suppliers   |
| `order.paid`                    | Orders     | Notifications         |
| `order.shipped`                 | Orders     | Notifications         |
| `order.cancelled`               | Orders     | Payments, Suppliers   |
| `payment.captured`              | Payments   | Orders                |
| `payment.failed`                | Payments   | Orders, Notifications |
| `supplier.order.shipped`        | Suppliers  | Orders                |
| `supplier.order.delivered`      | Suppliers  | Orders                |

All events implement the `DomainEvent` interface from `@workspace/domain/shared` and have a corresponding Zod schema in `@workspace/contracts/events` for validation at trust boundaries.

## 5. Ubiquitous Language

| Term            | Definition                                                      | Context   |
| --------------- | --------------------------------------------------------------- | --------- |
| Product         | Sellable item in the catalog; has variants.                     | Catalog   |
| Variant         | Specific configuration of a Product (size, color, ...).         | Catalog   |
| Category        | Hierarchical grouping of Products.                              | Catalog   |
| SKU             | Stock Keeping Unit; unique product/variant identifier.          | Catalog   |
| Customer        | Registered user who can place orders.                           | Customer  |
| Cart            | Transient collection of items a customer intends to buy.        | Cart      |
| CheckoutSession | Transient orchestration of the order-placement flow.            | Checkout  |
| Order           | Placed, immutable commitment to purchase.                       | Orders    |
| OrderItem       | Line item in an Order; snapshots product + price at order time. | Orders    |
| Fulfillment     | A subset of an Order shipped by one Supplier.                   | Orders    |
| Payment         | Intent to pay for an Order; has Transactions and Refunds.       | Payments  |
| Transaction     | A single provider-side operation (auth, capture, void).         | Payments  |
| Supplier        | Dropshipping partner that fulfills orders.                      | Suppliers |
| SupplierOrder   | An order placed with a Supplier for fulfillment.                | Suppliers |

## 6. Layering Rules (Domain-Specific)

```
Route Handler (apps/web/src/app/api/...)
    │
    ▼
Application Service (apps/web/src/modules/<module>/service.ts)
    │  imports: @workspace/domain/<ctx>, @workspace/contracts
    ▼
Domain Aggregate (packages/domain/<ctx>/index.ts)
    │  imports: @workspace/domain/shared only
    ▼
Repository Interface (defined in service, implemented in @workspace/database)
    │
    ▼
Prisma (packages/database)
```

**Rules:**

1. Domain (`packages/domain/*`) imports ONLY from `@workspace/domain/shared`. No Prisma, no Next.js, no external SDKs.
2. Contracts (`packages/contracts/*`) imports only `zod`. No domain, no infra.
3. Application Services (in `apps/web/src/modules/*`) import domain + contracts + repositories. This is where use-cases live.
4. Repositories (`@workspace/database`) implement interfaces defined in the service layer. They translate between Prisma models and domain aggregates.
5. Route Handlers import only application services + contracts (for request validation and response shaping).

## 7. Module Structure (in apps/web)

When a business module is implemented, it lives in `apps/web/src/modules/<module>/`:

```
src/modules/catalog/
├── service.ts          ← application service (use cases)
├── repository.ts       ← repository interface (impl in @workspace/database)
├── events.ts           ← event handlers (consume other contexts' events)
├── api/
│   ├── route.ts        ← GET /api/products (list)
│   └── [slug]/
│       └── route.ts    ← GET /api/products/[slug] (detail)
└── ui/                 ← React components for this module
```

This structure is repeated per module and is the physical manifestation of the bounded context inside the modular monolith.
