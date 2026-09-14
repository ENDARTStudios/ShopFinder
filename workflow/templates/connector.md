# Connector Template — ShopFinder

> Copy this template when implementing a new manufacturer or discovery connector. Fill in all sections.

## Objective

Implement a `[manufacturer/discovery]` connector for `[provider name]`.

## Context

- **Connector type**: [Discovery (finds offers) | Manufacturer (enriches products)]
- **Provider**: [e.g., NVIDIA, ASUS, Colorful]
- **Base class**: [BaseConnector | BaseManufacturerConnector]
- **API type**: [official_api | scraper | mirror | partner]
- **Protocol**: [rest | graphql | scrape_html]
- **Auth**: [api_key | oauth2 | basic | hmac | none]
- **Files read**: [list reference connectors read — e.g., intel/connector.ts, amd/parser.ts]

## Connector definition

```typescript
{
  manufacturerCode: "[code]",
  name: "[Provider] [API/Scraper]",
  kind: "[official_api|scraper|mirror|partner]",
  version: "[version]",
  protocol: "[rest|scrape_html]",
  endpoint: "[URL]",
  authType: "[auth]",
  rateLimitPerHour: [number],
  capabilities: [FULL_REST_CAPS | STANDARD_REST_CAPS | SCRAPE_CAPS],
  parserModule: "[provider]/parser.ts",
  mapperModule: "[provider]/mapper.ts"
}
```

## Files to create

- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/auth.ts`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/parser.ts`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/mapper.ts`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/connector.ts`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/index.ts`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/mapper.test.ts`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/connector-e2e.test.ts`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/fixtures/[product-1].json`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/fixtures/[product-2].json`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/fixtures/errors/not-found.json`
- [ ] `packages/infrastructure/src/connectors/manufacturers/[provider]/fixtures/errors/rate-limit.json`

## Registry updates

- [ ] Add manufacturer to `MANUFACTURERS` in `registry.ts`
- [ ] Add `ConnectorDefinition` to `CONNECTOR_DEFINITIONS`
- [ ] Add `ConnectorInstance` to `CONNECTOR_INSTANCES`
- [ ] Add `ManufacturerVersion` to `MANUFACTURER_VERSIONS`
- [ ] Add brand aliases to `routeBrandToManufacturer`
- [ ] Add seed product to `scripts/seed-catalog.ts`

## Acceptance criteria

- [ ] Parser handles 200 response correctly
- [ ] Parser handles 404 as not_found
- [ ] Parser throws on 500
- [ ] Mapper produces correct ParsedManufacturerSpec
- [ ] E2E test passes with ReplayTransport
- [ ] Cache hit on second call for same MPN
- [ ] TypeScript compiles with 0 errors
- [ ] ESLint passes with 0 warnings
- [ ] `bunx next build` succeeds
- [ ] Worklog entry appended

## Validation

```bash
bun test packages/infrastructure/src/connectors/manufacturers/[provider]/
bunx tsc --noEmit -p tsconfig.json
bunx eslint packages/infrastructure/src/connectors/manufacturers/[provider]/
bunx next build
bun run test:arch
```
