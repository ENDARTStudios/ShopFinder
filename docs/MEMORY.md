# MEMORY — Memória do Projeto

> O que o time (humanos e agentes) deve lembrar entre sessões. Decisões formais: `DECISOES.md` + `docs/adr/`. Log diário: `worklog.md`.

## Camadas de memória

| Camada                  | Conteúdo                                                                              | Atualização                               |
| ----------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- |
| `DECISOES.md` (raiz)    | Decisões operacionais `DECISAO-<área>-T<N>-<seq>` com contexto e consequências        | Todo PR com decisão nova                  |
| `docs/adr/` (31 ADRs)   | Decisões arquiteturais **imutáveis**                                                  | Novo ADR p/ superseder                    |
| `worklog.md`            | Diário de execução T0XX                                                               | Cada dia de trabalho                      |
| Memória do agente ZCode | Quirks de ambiente/learnings por sessão (`~/.zcode/cli/memories/projects/<projeto>/`) | Automática; indexada em `MEMORY.md` local |
| Este arquivo            | Learnings transversais que devem sobreviver a qualquer sessão                         | Ao fechar uma tarefa que ensina algo      |

## Learnings transversais (os que já custaram caro)

1. **Traps sqlite/postgres no CI:** o postinstall gera client **sqlite** sem `DATABASE_URL` → `@db.Date` (P1012), `mode:"insensitive"` e provider flip quebram. Desde T108 os jobs typecheck/lint/unit/knip exportam um `DATABASE_URL` postgres dummy; migrations/SQL pensados p/ postgres.
2. **Streaming soft-404 (Next):** com `loading.tsx`, `notFound()` no page vira 200 — gate real de 404 vai no `layout.tsx` do segmento (T032).
3. **Preços com NBSP:** `Intl` formata moeda com `\u00a0`; regex de validação precisa do NBSP explícito.
4. **`useSession` lança em SSR** sem SessionProvider (next-auth v4) — usar `getServerSession` no RSC + prop `isAuthenticated` (T081).
5. **eBay:** scope de **produção como STRING** nos 2 hosts; `EBAY_ENV=production` no `.env`.
6. **Vercel env pull** retorna valores `[SENSITIVE]` mascarados — não é backup de segredos.
7. **Commit completo:** `bun.lock` junto com `package.json` (CI frozen-lockfile); adds seletivos incluem `messages/` e `docs/`.
8. **Ler erro de CI/tsc linha a linha** — nunca resumir por contagem; `tail -2` esconde erros de lint.
9. **Stripe checkout hospedado:** `cs_test_` rotaciona a cada uso; `checkout.session.completed` precisa estar em `enabled_events` (causa-raiz do T020b).

## Política de escrita

- Aprendeu algo que **custaria retrabalho** a quem não souber → registra aqui ou na memória do agente (não ambos).
- Decisão **de arquitetura** → ADR. Decisão **operacional/de negócIo** → `DECISOES.md`. **Quirk de ambiente** → aqui + memória do agente.
- Corrigiu uma memória desatualizada → apaga/substitui, não deixa contraditória.
