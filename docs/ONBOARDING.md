# ONBOARDING — Primeiro Dia

> Trilha mínima para um dev/agente contribuir em ~1h.

## 1. Contexto (20 min, nesta ordem)

1. `AGENTS.md` (raiz) — processo obrigatório (issue → branch → PR → merge com checks verdes)
2. [README.md](README.md) desta pasta — mapa das 3 camadas de docs
3. [`eng/ARCHITECTURE.md`](eng/ARCHITECTURE.md) — workspaces e regra de dependência
4. [RULES.md](RULES.md) — o "não faça" (dinheiro em BigInt, storeId, i18n ×3, motion)
5. Papéis: **Doer** executa → **Thinker** revisa/aprova → **Operador** decide produção/segredos

## 2. Ambiente (15 min)

Ver [SETUP.md](SETUP.md): Bun instalado → `bun install` → copiar `.env.example` → `.env` → `npx prisma generate` → `npm run dev`.

⚠️ Armadilhas do primeiro dia:

- `bun install` sem `DATABASE_URL` flipa o schema p/ sqlite (postinstall) — restaure com `git checkout -- prisma/schema.prisma` e rode `prisma generate` de novo.
- O `.env` aponta para **Neon remoto de staging** — nunca rode teste destrutivo contra ele.
- Prisma generate dá EPERM se um dev server estiver vivo — mate `node.exe` antes.

## 3. Primeira tarefa (30 min)

1. Pegue/crie a issue no GitHub e a branch `fix|feat|chore/<n>-slug`
2. Código + testes conforme [DEVELOPMENT.md](DEVELOPMENT.md) e [`eng/TESTING.md`](eng/TESTING.md)
3. Valide local: `npm run typecheck`, `npm run lint`, `npm run test:arch`, testes do escopo
4. PR com `Closes #N` + checklist do `AGENTS.md` ([CODE_REVIEW.md](CODE_REVIEW.md))
5. Commits em Conventional Commits com ID da tarefa

## 4. Onde perguntar (arquivos, não pessoas)

- "Por que existe X?" → `docs/adr/` + `DECISOES.md`
- "Como se faz Y em UI?" → `eng/MOTION-SYSTEM.md` + [DESIGN.md](DESIGN.md)
- "O que quebrou ontem?" → `worklog.md`
- "Quirk estranho do ambiente?" → [MEMORY.md](MEMORY.md)
