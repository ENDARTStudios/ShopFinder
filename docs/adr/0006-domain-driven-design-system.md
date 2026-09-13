# ADR-0006: Domain-Driven Design System

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

A generic design system (Button, Card, Input, ...) forces business code to
compose primitives into the same domain shapes repeatedly — every product
list reassembles an image + title + price + rating + stock badge + add-to-cart
button. This:

- Duplicates layout logic across pages.
- Makes the ubiquitous language invisible in the UI layer.
- Slows down feature development (each page reinvents the same composites).
- Creates inconsistency (each developer assembles the composite slightly differently).

The user explicitly requested a **Domain-Driven Design System** where
components reflect the e-commerce domain (ProductCard, OrderStatusBadge,
StockBadge, ...).

## Decision

Structure `@workspace/ui` in domain-aware layers:

```
packages/ui/src/
├── tokens/        # design tokens (color, typography, spacing, ...)
├── primitives/    # re-export of shadcn/ui base components
├── commerce/      # ProductCard, Price, Money, Rating, StockBadge,
│                  # AddToCartButton, QuantitySelector, VariantSelector,
│                  # ProductGallery, ProductCarousel
├── admin/         # OrderStatusBadge, KPIWidget, DataTable, FilterPanel,
│                  # CustomerAvatar, ActivityTimeline
├── marketing/     # Hero, Banner, Countdown, Testimonial, Newsletter,
│                  # CTA, TrustBadge
└── charts/        # RevenueChart, OrdersBarChart, StatusDonut
```

### Rules

1. **Each domain component maps to a domain concept.** `ProductCard` reflects
   `ProductListItemDTO`. `OrderStatusBadge` reflects `OrderStatus`. If a
   component doesn't map to a domain concept, it belongs in `primitives`.

2. **Domain components consume tokens, not raw values.** Colors via
   `var(--success)`, spacing via the 4px scale, typography via `fontTokens`.
   This keeps the visual language centralized.

3. **Domain components are self-contained.** They accept typed props that
   mirror DTOs from `@workspace/contracts`. They do NOT import from
   `@workspace/database` or `@workspace/domain` (architecture test enforces).

4. **Primitives are re-exported, not rebuilt.** shadcn/ui (New York) is the
   base. The `primitives/` layer is a one-file indirection so swapping the
   underlying library is mechanical.

5. **Tokens are TypeScript + CSS vars.** TS constants for editor tooling
   (autocomplete, type-checking); CSS vars for runtime theming (light/dark,
   future white-label).

## Consequences

**Positive**

- Pages compose domain components, not primitives — faster feature development.
- The ubiquitous language is visible in the UI: `import { ProductCard }` reads
  as a domain statement.
- Consistency is structural: every product list uses `<ProductCard>`, so they
  all look the same.
- White-label / theming is centralized in tokens.

**Negative**

- More components to maintain (16 in commerce + admin + marketing).
- Domain components couple the UI to the domain shape — if a DTO changes,
  the component changes. This is acceptable and desirable.
- The `primitives/` re-export layer adds a small indirection.

## Alternatives Considered

- **Generic-only design system (Headless UI + custom primitives)** — rejected:
  forces every page to reassemble composites; loses domain alignment.
- **Domain components inside apps/web/src/components** — rejected: prevents
  reuse across future apps (admin panel, mobile) and couples UI to one app.
- **Material UI / Ant Design** — rejected: opinionated visual language that
  conflicts with our tokens; bundle size; hard to customize for white-label.

## References

- ADR-0005 (Domain Architecture — bounded contexts define the ubiquitous language)
- `docs/domain.md` § 5 (Ubiquitous Language glossary)
- `packages/ui/src/commerce/` (implementation)
