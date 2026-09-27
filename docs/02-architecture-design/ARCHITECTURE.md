# Arquitetura

> Reorganização 2026-09 (#79): arquivo fundido a partir de fontes separadas. Conteúdo de cada fonte preservado verbatim como "Parte N".

---

## Parte — ARCHITECTURE

> **Fonte canônica:** [`docs/02-architecture-design/ARCHITECTURE.md`](../02-architecture-design/ARCHITECTURE.md) (catálogo completo + feature flags).
> Este arquivo substitui o antigo `docs/architecture.md` (snapshot legado, absorvido por este arquivo na reorg #79).

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

- **Multi-tenant:** toda query carrega `storeId`; RLS no Postgres (flag `rls_enforcement`) — ver [`docs/05-security-compliance/RLS.md`](../05-security-compliance/RLS.md)
- **Dinheiro:** sempre minor units `BigInt` + `currencyCode` — nunca float
- **Feature flags:** catálogo central `@workspace/config/src/flags.ts` (`compare_v2`, `product_knowledge_ai`, `fx_live_quotes`, `rls_enforcement`, `mfa_admin`, `new_supplier_connector`); default off → on por store (`Store.settings`) → remoção da flag via Knip
- **i18n:** next-intl, locale via cookie `locale` (pt-BR/en/es-ES)
- **PWA:** `public/sw.js` (cache-first estáticos, network-first navegações públicas, LRU 50, nunca `/api|/conta|/admin`; kill-switch documentado no manual do Operador)

## Diagramas

Classes/sequência: [`docs/02-architecture-design/UML.md`](../02-architecture-design/UML.md). Persistência: [`docs/05-security-compliance/RLS.md`](../05-security-compliance/RLS.md) + `docs/persistence-model.md` (legado detalhado).

## Como manter

Mudança de workspace/dependência/flag exige atualizar `docs/02-architecture-design/ARCHITECTURE.md` no mesmo PR (checklist do `AGENTS.md`), e este resumo quando a estrutura macro mudar. Nova decisão estrutural = novo ADR (`docs/adr/`, ver [ADR.md](ADR.md)).

---

## Parte — ARCHITECTURE

Monorepo Turborepo: app Next.js (`src/`) + 24 workspaces `@workspace/*` (modular monolith, ADR-0001..0030 em `docs/adr/`).

## 1. Catálogo de apps/packages

| Package                                                                                                        | Responsabilidade                                                                                 | Dependências permitidas               |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `src/` (app)                                                                                                   | Next.js App Router, rotas, API routes, UI shell                                                  | application, auth, ui, seo, i18n, lib |
| `@workspace/domain`                                                                                            | Entidades puras, regras de domínio (DDD)                                                         | shared, contracts                     |
| `@workspace/application`                                                                                       | Casos de uso, `resolvePermissions`, orquestração                                                 | domain, contracts                     |
| `@workspace/contracts`                                                                                         | DTOs/schemas compartilhados (zod)                                                                | shared, validation                    |
| `@workspace/infrastructure`                                                                                    | Prisma repositories + **connectors/** (aliexpress, amazon, digikey, ebay, newegg, manufacturers) | domain, contracts                     |
| `@workspace/integrations`                                                                                      | Transports HTTP, conectores externos (ebay)                                                      | infrastructure, contracts             |
| `@workspace/database`                                                                                          | Schema Prisma, migrations, seed                                                                  | —                                     |
| `@workspace/auth`                                                                                              | NextAuth config, password (bcrypt), session/roles                                                | application                           |
| `@workspace/api`                                                                                               | Helpers de API routes (validação, erros)                                                         | contracts, auth                       |
| `@workspace/ui`                                                                                                | Design system compartilhado (shadcn base)                                                        | shared                                |
| `@workspace/seo`                                                                                               | Metadata builder, JSON-LD, sitemap, robots                                                       | shared                                |
| `@workspace/observability`                                                                                     | Logging estruturado, captura de erros                                                            | shared                                |
| `@workspace/jobs`                                                                                              | SyncJobs, pipelines, agendamento                                                                 | application, infrastructure           |
| `@workspace/events`                                                                                            | Outbox/Inbox events                                                                              | domain, database                      |
| `@workspace/ai`                                                                                                | Provas com z-ai-web-dev-sdk                                                                      | contracts                             |
| `@workspace/analytics`, `providers`, `i18n`, `config`, `shared`, `types`, `validation`, `testing`, `bootstrap` | Suporte transversal                                                                              | —                                     |

**Regra de dependência** (validada por `npm run test:arch` / `scripts/architecture-test.mjs`):
`app → application → domain → shared`. Infra/integrations só são consumidas via application. Nada importa de `src/`.

## 2. Feature Flags

Catálogo central `@workspace/config/src/flags.ts` (fonte única), lidas no server e passadas ao client via props (nunca `NEXT_PUBLIC` para flags sensíveis).

| Flag                     | Default | Descrição                             |
| ------------------------ | ------- | ------------------------------------- |
| `compare_v2`             | off     | Nova UI de comparação com scroll-sync |
| `product_knowledge_ai`   | on      | Painel de conhecimento IA no produto  |
| `fx_live_quotes`         | on      | Cotação BRL ao vivo (fallback: fixa)  |
| `rls_enforcement`        | off     | Ativa `FORCE ROW LEVEL SECURITY`      |
| `mfa_admin`              | off     | Exigir MFA para roles admin           |
| `new_supplier_connector` | off     | Rollout gradual de novos conectores   |

```ts
// @workspace/config/src/flags.ts (alvo)
export const featureFlags = {
  compare_v2: false,
  product_knowledge_ai: true,
  fx_live_quotes: true,
  rls_enforcement: false,
  mfa_admin: false,
  new_supplier_connector: false
} as const;
export type FlagKey = keyof typeof featureFlags;
```

Rollout: default off → on por store (override em `Store.settings`) → 100% → remoção da flag (dead code via Knip).
