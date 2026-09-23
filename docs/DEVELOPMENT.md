# DEVELOPMENT — Fluxo de Desenvolvimento Diário

> Ciclo curto: branch → commit (validado) → push → PR → checks → merge. Regras completas em `AGENTS.md`.

## Comandos essenciais

| Comando                               | Para quê                                                         |
| ------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                         | Dev server (Turbopack)                                           |
| `npm run typecheck`                   | Gate de tipos (CI também roda; `ignoreBuildErrors: false`)       |
| `npm run lint` / `npm run lint:fix`   | ESLint 9 + Prettier                                              |
| `npm run test:arch`                   | Contrato de arquitetura (`scripts/architecture-test.mjs`)        |
| `bun test`                            | Testes unitários (workspaces)                                    |
| `bunx playwright test`                | E2E local (sobe dev server)                                      |
| `bun run knip`                        | Dead code/exports                                                |
| `npx prisma generate` / `migrate dev` | Client/migrations (sempre com `DATABASE_URL` postgres no `.env`) |

## Antes de commitar

1. Typecheck + lint + testes do escopo verdes localmente.
2. i18n: chave nova nos **3** arquivos de `messages/` (paridade).
3. Segredo novo → `.env.example` (sem valor) + `eng/SECRETS.md`.
4. Commit com lint-staged passa (husky); Conventional Commits + ID da tarefa.
5. Adds seletivos e completos — incluir `messages/`, `docs/`, `bun.lock` quando mudou `package.json`.

## Fluindo com o repo

- **Contexto antes de grep:** `graft ask "<sua dúvida>" --source` (grafo em `graft/`); `graft skeleton <arquivo>` para superfície de API; `graft callers <símbolo>` para blast radius. Ressincronizar com `graft build` após mudanças grandes.
- **Página/rota nova:** metadata (`buildMetadata`), loading skeleton (`MOTION-SYSTEM.md`), 404 gate no `layout.tsx` do segmento se aplicável, sitemap quando pública.
- **Endpoint novo:** ver regras em [API.md](API.md).
- **Migration nova:** SQL idempotente; índice parcial no SQL cru; validar em container descartável, **nunca** no Neon de staging.

## Depois do PR

- CI: typecheck/lint/unit/knip (client postgres dummy) + build/integration/e2e (service Postgres) + CodeQL.
- Review pelo protocolo [CODE_REVIEW.md](CODE_REVIEW.md); merge com tudo verde; Vercel gera preview/produção automaticamente (Git Integration).
- Pós-merge: smoke da rota tocada (ver [QA_TESTING.md](QA_TESTING.md)) + `graft build` se a mudança foi grande.

## Interrupções/quirks de ambiente

Vidro: bun standalone empaca sob Lighthouse repetido (usar `next start`) · Playwright trava em `window.confirm` síncrono (try/catch + poll do diálogo) · `grep -c` conta linhas (HTML minificado = 1 linha; usar `grep -o | wc -l`). Mais em [MEMORY.md](MEMORY.md).
