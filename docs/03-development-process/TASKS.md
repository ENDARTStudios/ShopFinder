# TASKS — Sistema de Tarefas e Fila

> Como o trabalho é briefado, executado e aprovado. Log diário: `worklog.md` (raiz).

## Formato T0XX (briefs Doer)

Tarefas são numeradas (`T100`, `T104`…) e briefadas pelo **Thinker** com: objetivo, escopo ("NÃO mexer em…"), critérios de aceite, mensagem de commit literal quando aplicável, e validação exigida (evidências: greps, screenshots, respostas HTTP). O **Doer** executa e reporta nos campos definidos; o **Thinker** revisa com gates (`evidence`, `typecheck`, `lint`, `paridade`, `ci_green`, `commit`) e emite **APPROVED/REJECTED**; o **Operador** decide produção/credenciais. Detalhe: `PROMPT_SIMBIOSE_THINKER_DOER.md`, `PROTOCOLO_MESTRE.md`.

- Desvio de brief → **PROPOSTA_DOER** antes de implementar, nunca silêncio.
- Commit `--no-verify` e merge direto só quando o brief autoriza explicitamente.

## Fila atual (snapshot 2026-09-23)

**Recém-fechadas (mergeadas, CI verde):** T100 (claim verdadeiro) · T101 (fundação UI + PriceSnapshot) · T102/T107 (filtros/sort/URL-state) · T103 (PDP hub de decisão) · T104 (compare bar sticky) · T108 (CI typecheck/lint contra client postgres).

**Aguardando Operador** (espelho de `PENDENCIAS_OPERADOR.md`):

| Item                                  | Bloqueio                                             |
| ------------------------------------- | ---------------------------------------------------- |
| **P0** produção atrás de Vercel SSO   | Desabilitar Deployment Protection ou fornecer bypass |
| P1-2 Telegram bot                     | Token (E3)                                           |
| P1-3 Credenciais de fornecedores (B1) | Provisionar via Vercel env                           |
| P2-1 API pública                      | Decisão manter-pública (recomendação: MANTER)        |
| P2-3 Novos nichos                     | Lista do Operador                                    |
| P2-5 Announcement (pós T102–T104)     | Timing — hoje desbloqueado                           |
| TS7                                   | typescript-eslint ≥ 7.1 (PR #11 aberto com o fix)    |
| Console Vercel                        | Auto-delete preview deployments (resto do T104)      |

**Ratificações pendentes do Thinker:** cap 4 vs cap 3 na compare bar (T104).

## Como manter

- Snapshot desta fila atualizado quando a `PENDENCIAS_OPERADOR.md` muda de estado.
- Nova tarefa = nova issue GitHub + número T sequencial no `worklog.md`.
