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
