# Arquitetura — Visão de Entrada

> **Fonte canônica:** [`docs/eng/ARCHITECTURE.md`](eng/ARCHITECTURE.md) (catálogo completo + feature flags).
> Este arquivo substitui o antigo `docs/architecture.md` (snapshot legado, absorvido pela camada `eng/`).

## Topologia

Monorepo **Turborepo + Bun workspaces** (ADR-0001 modular monolith, ADR-0002):

```
src/                    → app Next.js 16 (App Router, rotas, API routes, UI shell)
@workspace/domain       → entidades puras, DDD (sem I/O)
@workspace/application  → casos de uso, resolvePermissions
@workspace/contracts    → DTOs/schemas zod
@workspace/infrastructure → Prisma repositories + connectors/ (aliexpress, amazon, digikey, ebay, newegg, manufacturers)
@workspace/integrations → transports HTTP externos
@workspace/database     → schema Prisma, migrations, seed
@workspace/auth         → NextAuth, bcrypt, session/roles
@workspace/ui / seo / observability / jobs / events / ai / analytics / i18n / config / shared / …
```

**Regra de dependência** (bloqueia `npm run test:arch` / `scripts/architecture-test.mjs`): `app → application → domain → shared`. Infra/integrations só são consumidas via application; nada importa de `src/`.

## Runtime

- **Next.js 16 App Router** (canary — risco aceito por async searchParams/params e history.pushState nativo p/ URL-state) + Turbopack
- **Prisma 6** + **Neon Postgres** (produção) — sqlite só para CI/sandbox
- **Vercel** (deploy via Git Integration; crons em `vercel.json`: price-alerts 13:00 UTC, price-snapshots 06:00 UTC)
- **Redis (Upstash)** para cache de cotação FX

## Padrões transversais

- **Multi-tenant:** toda query carrega `storeId`; RLS no Postgres (flag `rls_enforcement`) — ver [`eng/RLS.md`](eng/RLS.md)
- **Dinheiro:** sempre minor units `BigInt` + `currencyCode` — nunca float
- **Feature flags:** catálogo central `@workspace/config/src/flags.ts` (`compare_v2`, `product_knowledge_ai`, `fx_live_quotes`, `rls_enforcement`, `mfa_admin`, `new_supplier_connector`); default off → on por store (`Store.settings`) → remoção da flag via Knip
- **i18n:** next-intl, locale via cookie `locale` (pt-BR/en/es-ES)
- **PWA:** `public/sw.js` (cache-first estáticos, network-first navegações públicas, LRU 50, nunca `/api|/conta|/admin`; kill-switch documentado no manual do Operador)

## Diagramas

Classes/sequência: [`eng/UML.md`](eng/UML.md). Persistência: [`eng/RLS.md`](eng/RLS.md) + `docs/persistence-model.md` (legado detalhado).

## Como manter

Mudança de workspace/dependência/flag exige atualizar `eng/ARCHITECTURE.md` no mesmo PR (checklist do `AGENTS.md`), e este resumo quando a estrutura macro mudar. Nova decisão estrutural = novo ADR (`docs/adr/`, ver [ADR.md](ADR.md)).
