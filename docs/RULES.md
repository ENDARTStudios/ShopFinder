# RULES — Regras Duras do Projeto

> Condensação executável de `AGENTS.md` + convenções da casa. Em conflito, `AGENTS.md` vence.

## Processo (sem exceção)

1. **Sem issue, sem código.** Toda tarefa começa com Issue no GitHub (`ENDARTStudios/ShopFinder`).
2. Branch a partir de `main`: `fix/<n>-slug`, `feat/<n>-slug`, `chore/<n>-slug`.
3. Conventional Commits (`feat:`, `fix:`, `chore:`… + ID da tarefa, ex.: `fix: webhook grava Order T023`). Commitlint bloqueia fora do padrão.
4. **PR para `main`** com `Closes #N`; nunca commit direto em `main` (exceto `chore:` explicitamente autorizado pelo Thinker).
5. Merge só com **todos os checks verdes** (gate em `eng/SECURITY.md`).

## Código

- TypeScript **estrito**; ESLint 9 + Prettier; husky + lint-staged no commit.
- Dependência `app → application → domain → shared` (`npm run test:arch` bloqueia).
- **Preços sempre em minor units (BigInt) + currencyCode.** Nunca float para dinheiro.
- **Multi-tenant: toda query carrega `storeId`.** Dados sensíveis só via server components/API — nunca em client bundles.
- Tela nova ou carregamento assíncrono novo → `eng/MOTION-SYSTEM.md` (skeleton, lazy loading, entrada/saída, `prefers-reduced-motion`).
- Sem segredos no diff: novos segredos entram no `.env.example` (sem valor) + `eng/SECRETS.md`. **Nunca commitar `.env`.**
- i18n: chave nova = mensagem em **pt-BR, en e es-ES** (paridade validada por script).

## UI/Acessibilidade (checklist de PR)

- [ ] Skeletons + motion conforme `MOTION-SYSTEM.md`
- [ ] Foco visível, contraste, navegável por teclado, alvos ≥ 44px
- [ ] Conteúdo dinâmico com `aria-live` quando informa estado (ex.: contagem do compare bar)

## Dinheiro/Claims (jurídico)

- Claim público de marketing só com **prova verificável** (CDC art. 37 — lição T100).
- Copyright em textos: símbolo **©**, nunca "(c)".
- Sem promessa de preço/data em páginas de produto em desenvolvimento (padrão /pro, T105).

## Dados

- O `.env` local aponta para **Neon remoto de staging — nunca usar como sandbox** (container Postgres descartável para testes destrutivos).
- Migrations idempotentes (`IF NOT EXISTS` / `EXCEPTION WHEN duplicate_object`); índices parciais vão no SQL (Prisma não expressa).
- Agregações append-only com idempotência diária (padrão `PriceSnapshot`: unique `offerId+capturedDay`, P2002 = skip).

## Automação/Agentes

- Cron/API interna sensível → **fail-closed** (Bearer `CRON_SECRET`; sem secret = 503/401, nunca open).
- Uso de ferramentas de agente (toolbelt) conforme `eng/AGENT-TOOLBELT.md`; adoção nova exige ratificação do Operador.
