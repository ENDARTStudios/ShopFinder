# RESEARCH — Log de Pesquisa Técnica

> Formato: cada entrada tem pergunta, achados, conclusão e status. Fontes externas verificadas em `docs/eng/AGENT-TOOLBELT.md` e no `worklog.md` do dia.

## Como registrar

```
### R-<seq> — <pergunta> (data)
**Contexto:** por que pesquisamos
**Achados:** o que foi testado/lido (com comandos/URLs)
**Conclusão:** decisão ou próximo passo
**Status:** concluído | em andamento | bloqueado (por quem)
```

## Entradas

### R-1 — eBay: combo de credenciais sandbox × produção (2026-09)

Scope de **produção como STRING** funciona nos dois hosts; keyset atual válido (129k itens em produção). `EBAY_ENV=production`. Status: **concluído** (T047/T055).

### R-2 — TypeScript 7 (tsgo) viável como target? (2026-09)

Bloqueado por typescript-eslint 8.67 (não suporta TS 7.0). Fix TS2320 já pronto na branch do PR #11; reabrir quando typescript-eslint ≥ 7.1. Status: **em hold** (DECISAO-TOOLING-TS7-001).

### R-3 — CI: por que typecheck/lint quebravam com client sqlite? (2026-09)

Postinstall `select-prisma-provider` sem `DATABASE_URL` → schema flipado p/ sqlite → `@db.Date` P1012, `mode:"insensitive"` sem tipo, provider mismatch. Família fechada com `DATABASE_URL` postgres dummy nos jobs que só geram client (T108). Status: **concluído**.

### R-4 — Lighthouse/PWA local: como medir sem false readings? (2026-08/09)

`bun` standalone empaca sob LH repetido → `next start` + health-check + 1 run/vez + matar chromes zumbis; LH12 não tem categoria PWA (prova offline via CDP). Status: **concluído** (receita no manual).

### R-5 — Skill typesafe-ai: adoção no toolbelt? (2026-09)

Instalada após `RATIFICO-TYPESAFE` (Socket 0 alerts / Snyk Low; conteúdo = guia MIT sem código executável). Integração só via brief + `TYPESAFE_API_KEY` server-side; candidato: pré-triagem de reviews flagged (D1). Docs live `docs.typesafe.ai/llms.txt`. Status: **instalada, integração pendente**.

### R-6 — RLS: como validar sem tocar o Neon de staging? (2026-09)

Neon do `.env` é remoto e **não é sandbox**; receita: container Postgres descartável + migrations + policies + testes de isolamento por store. Status: **concluído** (receita em `eng/RLS.md`).

## Backlog de pesquisa

- Calibração de Score/Noul (TypeSafe) para triagem de reviews — só quando D1 for briefado.
- Estratégia de nichos novos (depende da lista do Operador, P2-3).
