# AGENTS.md — Padrão de Trabalho para Agentes de IA (qualquer modelo)

Este arquivo define o processo obrigatório para todo agente (Claude, GPT, GLM, Gemini, OpenHands, etc.) que trabalhe neste repositório. Leia antes de qualquer mudança.

## 1. Fluxo obrigatório: Issue → Branch → PR → Deploy

1. **Toda tarefa** (correção, melhoria ou nova função) **começa com uma Issue no GitHub** (`ENDARTStudios/ShopFinder`). Sem issue, sem código.
2. Branch a partir de `main` nomeada: `fix/<issue-num>-slug`, `feat/<issue-num>-slug` ou `chore/<issue-num>-slug`.
3. Commits em Conventional Commits (`feat:`, `fix:`, `chore:`...) — commitlint bloqueia fora do padrão. Inclua o ID da tarefa quando existir (ex.: `fix: webhook grava Order T023`).
4. **PR para `main`** com a issue referenciada na descrição (`Closes #N`). O deploy é gerenciado pelo merge do PR — nunca commite direto em `main`.
5. PR só é mergeado com todos os checks verdes (ver gate em `docs/eng/SECURITY.md`).

## 2. Documentação de engenharia (leia o que for relevante)

| Documento | Conteúdo |
|---|---|
| `docs/eng/PRD.md` | Requisitos do produto |
| `docs/eng/UML.md` | Diagramas de classe e sequência |
| `docs/eng/RBAC.md` | Matriz de acesso |
| `docs/eng/RLS.md` | Row Level Security (Postgres) |
| `docs/eng/ARCHITECTURE.md` | Catálogo de apps/packages + feature flags + regra de dependências |
| `docs/eng/SECRETS.md` + `.env.example` | Variáveis de ambiente — nunca commitar `.env` |
| `docs/eng/OBSERVABILITY.md` | Error reporting, logs, tracing, SLOs |
| `docs/eng/TESTING.md` | Testes unit/integração/E2E, cobertura, ferramentas de qualidade |
| `docs/eng/SECURITY.md` | Gate de deploy, WAF, rate limiting, TLS/HSTS Full (Strict), Zero Trust |
| `docs/eng/SEO-AEO-AIO-GEO.md` | Estratégia de busca e engines de IA |
| `docs/eng/MOTION-SYSTEM.md` | Padrões obrigatórios de skeleton/lazy loading/animação |
| `docs/eng/FRONTEND-DESIGN.md` | Direção visual e stack de UI/UX |

Histórico de decisões: `docs/adr/` (30 ADRs). Não contradiga um ADR sem abrir um novo.

## 3. Regras de código

- TypeScript estrito; estilo ESLint + Prettier já configurados (husky + lint-staged rodam no commit).
- Respeitar a regra de dependência: `app → application → domain → shared` (`npm run test:arch` valida).
- Preços sempre em minor units (BigInt) + currencyCode. Nunca use float para dinheiro.
- Multi-tenant: toda query carrega `storeId`. Dados sensíveis só via server components/API.
- Novos segredos → adicionar ao `.env.example` (sem valor) e documentar em `docs/eng/SECRETS.md`.
- Tela nova ou carregamento assíncrono novo → seguir `docs/eng/MOTION-SYSTEM.md` (skeleton, lazy loading, animação de entrada/saída, `prefers-reduced-motion`).

## 4. Checklist de PR

- [ ] Issue referenciada (`Closes #N`)
- [ ] Testes (unitário/integração conforme escopo) adicionados ou atualizados
- [ ] Sem segredos no diff (gitleaks)
- [ ] Docs atualizadas se arquitetura/fluxo mudou
- [ ] UI: skeletons + motion conforme `MOTION-SYSTEM.md`
- [ ] Acessibilidade: foco visível, contraste, teclado

## 5. Ferramentas disponíveis

- `npm run dev` — dev server · `npm run test:arch` — contrato de arquitetura
- `tests/integration` — testes de integração (bun:test contra `TEST_BASE_URL`)
- Skills do repo: `.agents/skills/` (motion-design, ui-ux-pro-max)

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
- Toolbelt de agentes (browser-use, Agent-Reach, skill diagram-design, Strix, matrix de adoção): `docs/eng/AGENT-TOOLBELT.md`
