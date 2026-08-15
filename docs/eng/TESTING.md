# Testes — Unitários, Integração e E2E

## 1. Pirâmide

| Camada | Ferramenta | Local | Roda em |
|---|---|---|---|
| Unit | `bun:test` (ou vitest) | `packages/*/src/**/*.test.ts` | CI, pre-push |
| Integração | `bun:test` contra dev server | `tests/integration/*.test.ts` (já existem 6) | CI (job com service Postgres) |
| E2E | Playwright | `tests/e2e/*.spec.ts` | CI (job dedicado) |
| Arquitetura | script próprio | `scripts/architecture-test.mjs` | CI |
| Segurança | gitleaks + CodeQL + npm audit | workflows existentes | CI |

## 2. Convenções

- Unit: testam `@workspace/domain` e `application` puros (price math, `resolvePermissions`, normalização de conectores). Sem I/O.
- Integração: sobem `next dev` + `TEST_BASE_URL`; cobrem API admin (com auth mock), compare, webhook (assinatura válida/inválida), pipeline status.
- E2E (Playwright) — jornadas críticas:
  1. Buscar produto → abrir `/produtos/[slug]` → adicionar ao carrinho.
  2. Compare: adicionar 2 produtos e ver tabela.
  3. Login admin → `/admin/pipeline` renderiza status.
  4. Checkout Stripe em modo teste → webhook → pedido criado.
- Screenshots + traces em falha (artefatos de CI).

## 3. Config Playwright (alvo)

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000", trace: "on-first-retry" },
  webServer: { command: "bun run dev", url: "http://localhost:3000", reuseExistingServer: true },
});
```

## 4. Qualidade e lint de código

| Ferramenta | Uso | Gate |
|---|---|---|
| ESLint + Prettier | já configurados (husky + lint-staged) | bloqueia |
| Knip | dead code / exports não usados | aviso → bloqueio |
| arch-test (`npm run test:arch`) | dependências entre camadas | bloqueia |
| CodeQL | SAST semanal | bloqueia alerts high+ |
| Stryker (mutation) | alvo: módulos `domain`/`fx` | métrica, não gate |
| commitlint + changesets | já configurados | bloqueia |

## 5. Cobertura (Codecov)

- Instrumentação: `bun test --coverage` + Playwright `--coverage`; upload no CI.
- Gate inicial: 60% global, subindo 5% por trimestre; 90% para `@workspace/domain` e `src/lib/fx.ts` (matemática de dinheiro).
