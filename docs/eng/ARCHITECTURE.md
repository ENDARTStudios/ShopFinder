# Arquitetura Modular — Catálogo de Apps + Feature Flags

Monorepo Turborepo: app Next.js (`src/`) + 24 workspaces `@workspace/*` (modular monolith, ADR-0001..0030 em `docs/adr/`).

## 1. Catálogo de apps/packages

| Package | Responsabilidade | Dependências permitidas |
|---|---|---|
| `src/` (app) | Next.js App Router, rotas, API routes, UI shell | application, auth, ui, seo, i18n, lib |
| `@workspace/domain` | Entidades puras, regras de domínio (DDD) | shared, contracts |
| `@workspace/application` | Casos de uso, `resolvePermissions`, orquestração | domain, contracts |
| `@workspace/contracts` | DTOs/schemas compartilhados (zod) | shared, validation |
| `@workspace/infrastructure` | Prisma repositories + **connectors/** (aliexpress, amazon, digikey, ebay, newegg, manufacturers) | domain, contracts |
| `@workspace/integrations` | Transports HTTP, conectores externos (ebay) | infrastructure, contracts |
| `@workspace/database` | Schema Prisma, migrations, seed | — |
| `@workspace/auth` | NextAuth config, password (bcrypt), session/roles | application |
| `@workspace/api` | Helpers de API routes (validação, erros) | contracts, auth |
| `@workspace/ui` | Design system compartilhado (shadcn base) | shared |
| `@workspace/seo` | Metadata builder, JSON-LD, sitemap, robots | shared |
| `@workspace/observability` | Logging estruturado, captura de erros | shared |
| `@workspace/jobs` | SyncJobs, pipelines, agendamento | application, infrastructure |
| `@workspace/events` | Outbox/Inbox events | domain, database |
| `@workspace/ai` | Provas com z-ai-web-dev-sdk | contracts |
| `@workspace/analytics`, `providers`, `i18n`, `config`, `shared`, `types`, `validation`, `testing`, `bootstrap` | Suporte transversal | — |

**Regra de dependência** (validada por `npm run test:arch` / `scripts/architecture-test.mjs`):
`app → application → domain → shared`. Infra/integrations só são consumidas via application. Nada importa de `src/`.

## 2. Feature Flags

Catálogo central `@workspace/config/src/flags.ts` (fonte única), lidas no server e passadas ao client via props (nunca `NEXT_PUBLIC` para flags sensíveis).

| Flag | Default | Descrição |
|---|---|---|
| `compare_v2` | off | Nova UI de comparação com scroll-sync |
| `product_knowledge_ai` | on | Painel de conhecimento IA no produto |
| `fx_live_quotes` | on | Cotação BRL ao vivo (fallback: fixa) |
| `rls_enforcement` | off | Ativa `FORCE ROW LEVEL SECURITY` |
| `mfa_admin` | off | Exigir MFA para roles admin |
| `new_supplier_connector` | off | Rollout gradual de novos conectores |

```ts
// @workspace/config/src/flags.ts (alvo)
export const featureFlags = {
  compare_v2: false,
  product_knowledge_ai: true,
  fx_live_quotes: true,
  rls_enforcement: false,
  mfa_admin: false,
  new_supplier_connector: false,
} as const;
export type FlagKey = keyof typeof featureFlags;
```

Rollout: default off → on por store (override em `Store.settings`) → 100% → remoção da flag (dead code via Knip).
