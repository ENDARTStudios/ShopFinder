# ROADMAP — Direção e Iniciativas

> **Fonte canônica:** [`docs/eng/ROADMAP-NOVA-DIRECAO.md`](eng/ROADMAP-NOVA-DIRECAO.md) (17 iniciativas, set/2026). Planos legados: `PLANO_MESTRE.md` (fases 0–9 do protocolo) e `docs/product-vision.md`.

## Onde estamos

Produto reposicionado como **"Commerce Utility"** (T100–T108, set/2026): utilidade de compra verdadeira, UI sóbria, claims com prova. A camada de decisão de compra está fechada: resultados filtráveis com URL-state, PDP hub (preço/histórico/specs/reviews), compare com barra sticky.

## Iniciativas NOVA_DIRECAO (9 de 17 implementadas)

**Feitas:** wishlist (A3) · histórico local (A2) · recomendações (A1) · `/guias` (B3) · `/pro` (C1) · API pública + `/api-docs` (E2) · scaffold Telegram (E3) · reviews flagged no bell (D1) · DR+backup (F2).

**Abertas (seleção — lista completa no `eng/`):**

| Iniciativa                     | Bloqueio                          |
| ------------------------------ | --------------------------------- |
| Telegram operacional           | Token do bot (P1-2)               |
| Novos conectores/nichos        | Credenciais (P1-3) + lista (P2-3) |
| Announcement da nova camada UX | Timing (P2-5) — desbloqueado      |
| IA de moderação (D1+)          | `TYPESAFE_API_KEY` + brief        |

## Infra/qualidade

- **TS7** em hold até typescript-eslint ≥ 7.1 (PR #11 com o fix pronto).
- Produção atrás de **Vercel SSO (P0)** — decisão do Operador.
- Cobertura sobe para 80% por módulo gradualmente (Codecov).

## Princípios de priorização

1. Verdade antes de velocidade (claim com prova, dado sem invenção).
2. UX de decisão de compra > novidade estética.
3. Tudo gated entra com flag e sai com Knip.
