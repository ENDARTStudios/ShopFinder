# CHOOSE_TECH_STACK — Por Que Esta Stack

> Racional de cada escolha. Mudar qualquer item abaixo = novo ADR. Detalhes em `docs/adr/`.

## Stack atual

| Camada              | Escolha                                                      | Por quê                                                                                                                                               |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework           | **Next.js 16 App Router** (canary)                           | RSC server-first (SEO/GEO), async searchParams, history.pushState nativo p/ URL-state sem reload (T107). Canary = risco consciente, retrado por gates |
| Runtime/gerenciador | **Bun** (workspaces) + Turborepo                             | Velocidade de install/scripts; ADR-0002                                                                                                               |
| Linguagem           | **TypeScript estrito** (`ignoreBuildErrors: false`, job CI)  | Contrato de tipos é gate, não sugestão (divida zerada T049)                                                                                           |
| Domínio             | Modular monolith DDD (`app → application → domain → shared`) | Escala do time não pede microsserviços; `test:arch` valida (ADR-0001/0005)                                                                            |
| Banco               | **Postgres (Neon)** + Prisma 6                               | Serverless-friendly, RLS nativo, PITR; sqlite só p/ CI/sandbox (ADR-0009)                                                                             |
| Deploy              | **Vercel** (Git Integration + crons)                         | Previews por PR, rollback, cron sem infra própria                                                                                                     |
| Cache               | Upstash Redis                                                | Cotação FX com TTL curto                                                                                                                              |
| UI                  | Tailwind v4 + shadcn/ui                                      | Tokens no CSS, dark mode via `@custom-variant`; componentes auditáveis no repo                                                                        |
| i18n                | next-intl (cookie `locale`)                                  | 3 locales, mensagens por namespace, paridade scriptável                                                                                               |
| Auth                | NextAuth v4 (JWT) + bcrypt                                   | Credentials simples, RBAC `resolvePermissions`                                                                                                        |
| Pagamento           | Stripe Checkout (hospedado)                                  | PCI fora do app; webhook idempotente                                                                                                                  |
| Testes              | bun:test + Playwright + arch-test + CodeQL + gitleaks        | Pirâmide enxuta, gates reais (`docs/03-development-process/TESTING.md`)                                                                               |

## Decisões de stack em hold

- **TypeScript 7 (tsgo):** bloqueado por typescript-eslint 8.67 — reabrir com release ≥ 7.1 (DECISAO-TOOLING-TS7-001; fix TS2320 pronto no PR #11).

## Regra de adoção (novas dependências)

1. Justificativa por escrito (que problema, qual alternativa, custo de supply-chain).
2. Inventário antes do bump (major = revisão de breaking changes linha a linha).
3. `bun.lock` no mesmo commit; CI verde; Dependabot/audit monitorando (T094/T095 fecharam a limpeza).
4. Ferramenta **de agente** segue `docs/03-development-process/AGENT-TOOLBELT.md` + ratificação do Operador (ex.: TypeSafe RATIFICO-TYPESAFE, set/2026).
