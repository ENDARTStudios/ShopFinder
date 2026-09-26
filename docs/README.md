# Documentação — ShopFinder

> Última atualização: 2026-09-23 · Mantida junto com o PR que muda arquitetura/fluxo (checklist do `AGENTS.md`).

## Estrutura em 3 camadas

| Camada                                    | Papel                                                                            | Verdade?                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| `docs/*.md` (UPPERCASE)                   | **Camada de entrada/governança** — instruções por tema, apontando para as fontes | Resumo; em conflito, a camada `eng/` vence |
| `docs/eng/*.md`                           | **Engenharia canônica** — specs completas (PRD, arquitetura, segurança, testes…) | ✅ Fonte da verdade                        |
| `docs/adr/*.md` (31 ADRs) + `docs/legal/` | Decisões imutáveis + documentos legais v2 (LGPD)                                 | ✅ Fonte da verdade                        |

Na raiz do repo: `AGENTS.md` (processo obrigatório), `AUTONOMO.md` (prompt de execução autônoma — Thinker+Doer combinados), `DECISOES.md` (decisões operacionais), `PENDENCIAS_OPERADOR.md`, `MANUAL_DO_OPERADOR.md`, `SECURITY.md`, `CHANGELOG.md`, `worklog.md`.

## Índice da camada de entrada

| Arquivo                                                                                       | Tema                                                       |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [PRD.md](PRD.md)                                                                              | Requisitos do produto (visão, personas, RF/RNF)            |
| [ARCHITECTURE.md](ARCHITECTURE.md)                                                            | Monorepo, workspaces, regra de dependência, feature flags  |
| [RULES.md](RULES.md)                                                                          | Regras duras de código e processo (o "não faça")           |
| [DESIGN.md](DESIGN.md)                                                                        | Direção visual "Commerce Utility" e motion                 |
| [TASKS.md](TASKS.md)                                                                          | Sistema de tarefas T0XX e fila atual                       |
| [MEMORY.md](MEMORY.md)                                                                        | Memória do projeto (decisões, learnings, quirks)           |
| [RESEARCH.md](RESEARCH.md)                                                                    | Log de pesquisa técnica                                    |
| [ROADMAP.md](ROADMAP.md)                                                                      | Roadmap NOVA_DIRECAO e fases                               |
| [ONBOARDING.md](ONBOARDING.md)                                                                | Primeiro dia no repo                                       |
| [CHANGELOG.md](CHANGELOG.md)                                                                  | Convenção de changelog + marcos recentes                   |
| [SEO.md](SEO.md) · [AEO.md](AEO.md) · [GEO.md](GEO.md) · [AIO.md](AIO.md)                     | Estratégia de busca e engines de IA (split por disciplina) |
| [PERFORMANCE.md](PERFORMANCE.md)                                                              | Orçamentos de performance e Lighthouse                     |
| [ACCESSIBILITY.md](ACCESSIBILITY.md)                                                          | WCAG AA, teclado, foco, aria                               |
| [COMPLIANCE.md](COMPLIANCE.md)                                                                | LGPD, CDC, copyright                                       |
| [ERROR_HANDLING.md](ERROR_HANDLING.md)                                                        | Taxonomia de erros, fail-closed, boundaries                |
| [BACKUP_DR.md](BACKUP_DR.md)                                                                  | Backup e recuperação de desastres                          |
| [STYLE_GUIDE.md](STYLE_GUIDE.md)                                                              | Estilo de código e de copy                                 |
| [API.md](API.md)                                                                              | API pública v1 + superfície interna                        |
| [INTEGRATIONS.md](INTEGRATIONS.md)                                                            | Conectores e integrações externas                          |
| [ANALYTICS.md](ANALYTICS.md)                                                                  | Analytics privacy-first                                    |
| [CONTENT.md](CONTENT.md)                                                                      | Diretrizes de conteúdo editorial                           |
| [ADR.md](ADR.md)                                                                              | Convenção de ADR + índice                                  |
| [DEFINE_THE_USER.md](DEFINE_THE_USER.md)                                                      | Personas e anti-personas                                   |
| [CHOOSE_TECH_STACK.md](CHOOSE_TECH_STACK.md)                                                  | Por que cada tecnologia                                    |
| [TASK_BREAKING_DOWN.md](TASK_BREAKING_DOWN.md)                                                | Como quebrar tarefas em briefs T0XX                        |
| [SETUP.md](SETUP.md) · [DEVELOPMENT.md](DEVELOPMENT.md)                                       | Ambiente e dia a dia                                       |
| [TESTING.md](TESTING.md) · [QA_TESTING.md](QA_TESTING.md)                                     | Testes automatizados e QA manual                           |
| [SECURITY_REVIEW.md](SECURITY_REVIEW.md) · [CODE_REVIEW.md](CODE_REVIEW.md)                   | Protocolos de revisão                                      |
| [PREVIEW_DEPLOYMENT.md](PREVIEW_DEPLOYMENT.md) · [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md) | Deploys Vercel                                             |
| [MONITORING.md](MONITORING.md)                                                                | Observabilidade, SLOs, Sentry                              |
| [ITERATION.md](ITERATION.md)                                                                  | Ciclo de melhoria contínua                                 |

## Arquivos legados (mantidos, não deletar)

- `docs/domain.md`, `docs/persistence-model.md`, `docs/product-vision.md` — visões históricas pré-`eng/`; usar `eng/` como canônico.
- `docs/decisions.md` — índice dos ADRs (só até 0025; lista completa em `adr/` e [ADR.md](ADR.md)).
- `docs/DEPLOY.md`, `docs/DEMO_CHECKLIST.md`, `docs/credentials-guide.md` — absorvidos por [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md), [QA_TESTING.md](QA_TESTING.md) e `docs/eng/SECRETS.md`.
- `docs/brand-system.md`, `docs/brand-grid.md` — absorvidos por [DESIGN.md](DESIGN.md) e `docs/eng/FRONTEND-DESIGN.md`.

## Ordem de leitura por papel

- **Novo agente/dev:** [ONBOARDING.md](ONBOARDING.md) → `AGENTS.md` → `eng/ARCHITECTURE.md` → [RULES.md](RULES.md)
- **Reviewer (Thinker):** [CODE_REVIEW.md](CODE_REVIEW.md) → [RULES.md](RULES.md) → `eng/SECURITY.md`
- **Operador (produção):** `MANUAL_DO_OPERADOR.md` → [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md) → [MONITORING.md](MONITORING.md) → `PENDENCIAS_OPERADOR.md`
