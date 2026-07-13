# ADR-0014: Lookup Contexts (Currency & Country)

- **Status:** Accepted
- **Date:** 2026-07-11
- **Deciders:** project lead
- **Supersedes:** —

## Context

The platform needs reference data for currencies (ISO 4217) and countries
(ISO 3166-1). Initially these could be hardcoded constants, but:

1. **Admin UI** needs to manage which currencies/countries are active per store.
2. **Tax rules** are keyed by country — need a country table for joins.
3. **Shipping rules** are keyed by country — same.
4. **Currency formatting** needs decimal places + symbol per currency (JPY has
   0 decimals, USD has 2). Hardcoding leads to inconsistencies.
5. **Internationalization** (item 20 in backlog) will need active currency/country
   sets per store.

The user explicitly requested both lookup tables before the Prisma schema is
frozen (Ajustes 4 & 5 of 04B.1 feedback).

## Decision

Add two lookup tables as a new `Lookup` bounded context in the domain.

### Currency table

| Column         | Type      | Notes                               |
| -------------- | --------- | ----------------------------------- |
| code           | String PK | ISO 4217 (e.g. "USD", "BRL", "JPY") |
| name           | String    | "US Dollar"                         |
| symbol         | String    | "$"                                 |
| decimalPlaces  | Int       | 2 for USD, 0 for JPY                |
| active         | Boolean   | admin can deactivate                |
| + audit fields |           |                                     |

### Country table

| Column         | Type      | Notes                                             |
| -------------- | --------- | ------------------------------------------------- |
| code           | String PK | ISO 3166-1 alpha-2 (e.g. "US", "BR")              |
| name           | String    | "United States"                                   |
| region         | String    | "Americas", "Europe", "Asia", "Africa", "Oceania" |
| active         | Boolean   | admin can deactivate                              |
| + audit fields |           |                                                   |

### Seed data

- 12 major currencies (USD, EUR, BRL, GBP, JPY, CNY, CAD, AUD, CHF, INR, MXN, SGD).
- 20 major countries across all regions.
- Seed is idempotent (upserts by PK).

### Domain module

`packages/domain/src/lookup/index.ts` exports:

- `Currency` and `Country` interfaces.
- `SEED_CURRENCIES` and `SEED_COUNTRIES` constants (used by the seed script).

These are NOT aggregate roots with rich behavior — they're reference data with
soft delete + audit fields. Modeled as simple entities.

## Consequences

**Positive**

- No hardcoded ISO codes in business logic — everything references the DB.
- Admin can activate/deactivate currencies and countries per deployment.
- Tax and shipping rules can JOIN to the country table.
- Currency formatting uses `decimalPlaces` from the DB, not a hardcoded map.
- Foundation for multi-currency checkout (item 10 in backlog).

**Negative**

- Two extra tables + seed data.
- Must join to currency/country for display (negligible cost, indexed by PK).
- Seed must run before any business data can be created (enforced by seed
  script ordering).

## Alternatives Considered

- **Hardcoded constants in a TS file** — rejected: can't be managed at runtime,
  no soft delete, no audit.
- **Use a third-party ISO library** — rejected: adds a dependency, still
  can't deactivate per store, no DB join for tax/shipping rules.
- **Store currency/country config in Store.settings JSONB** — rejected: no
  joins, no indexing, no admin UI for management.

## References

- ADR-0009 (Persistence Model — Currency and Country tables)
- `packages/domain/src/lookup/index.ts` (domain module + seed data)
- `scripts/seed.ts` (seeds both tables on first run)
- `prisma/schema.prisma` (Currency, Country models)
