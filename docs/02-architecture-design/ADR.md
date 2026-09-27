# ADR — Architecture Decision Records

> Reorganização 2026-09 (#79): arquivo fundido a partir de fontes separadas. Conteúdo de cada fonte preservado verbatim como "Parte N".

---

## Parte — ADR

> **Repositório:** [`docs/adr/`](../adr/) (0001–0031). **Índice legado:** `docs/decisions.md` (até 0025 — lista autoritativa é a pasta). Decisões **operacionais** (não-arquiteturais) vivem em `DECISOES.md` na raiz.

## Convenção

- Um arquivo por decisão, numerado `NNNN-kebab-case-title.md`.
- Formato: `Status · Context · Decision · Consequences · Alternatives`.
- ADR aceito é **imutável**. Para revogar/suplantar: novo ADR referenciando o anterior (ex.: 0030 foundation-freeze).
- "Não contradiga um ADR sem abrir um novo" (regra do `AGENTS.md`).

## Últimas decisões (por que o sistema é assim)

| ADR  | Tema                                            |
| ---- | ----------------------------------------------- |
| 0001 | Modular monolith como topologia inicial         |
| 0002 | Bun workspaces + Turborepo                      |
| 0007 | Architecture tests (regra de dependência no CI) |
| 0012 | Multi-store foundation                          |
| 0013 | Outbox/Webhook/Inbox                            |
| 0018 | Provider (connector) architecture               |
| 0022 | Feature slice organization                      |
| 0030 | Foundation freeze                               |
| 0031 | Price alerts + in-app notifications             |

## Quando abrir um ADR (vs DECISOES.md vs este docs/)

- **ADR:** escolha estrutural de longo prazo (padrão, topologia, contrato entre camadas).
- **`DECISOES.md`:** decisão operacional/de negócio datada (`DECISAO-<área>-T<N>-<seq>`) — ex.: DECISAO-CI-PRISMA-001 (T108), DECISAO-TOOLING-TS7-001 (TS7 em hold), DECISAO-MARKETING-T100-001 (claim verdadeiro).
- **[MEMORY.md](../08-knowledge-management/MEMORY.md):** aprendizado transversal sem decisão formal.

## Passo a passo

1. Copiar o template do ADR mais recente; numerar sequencial.
2. Escrever **contexto real** (restrições que forçaram a escolha) e alternativas consideradas.
3. PR referenciando a issue; revisor valida coerência com `test:arch`/CI.
4. Adicionar linha no `decisions.md` (índice) se quiser mantê-lo correto.

---

## Parte — decisions

| #    | Title                                                   | Status   | Date       |
| ---- | ------------------------------------------------------- | -------- | ---------- |
| 0001 | Modular Monolith as initial topology                    | Accepted | 2026-07-11 |
| 0002 | Bun workspaces + Turborepo monorepo                     | Accepted | 2026-07-11 |
| 0003 | Sandbox-constrained layout adaptation                   | Accepted | 2026-07-11 |
| 0004 | Decoupled AI provider layer                             | Accepted | 2026-07-11 |
| 0005 | Domain Architecture — Bounded Contexts & Aggregates     | Accepted | 2026-07-11 |
| 0006 | Domain-Driven Design System                             | Accepted | 2026-07-11 |
| 0007 | Architecture Tests                                      | Accepted | 2026-07-11 |
| 0008 | In-Process Domain Event Bus                             | Accepted | 2026-07-11 |
| 0009 | Persistence Model                                       | Accepted | 2026-07-11 |
| 0010 | Unit of Work                                            | Accepted | 2026-07-11 |
| 0011 | Query / Command Separation                              | Accepted | 2026-07-11 |
| 0012 | Multi-Store Foundation & Persistence Refinements        | Accepted | 2026-07-11 |
| 0013 | Outbox Pattern & Webhook Inbox                          | Accepted | 2026-07-11 |
| 0014 | Lookup Contexts (Currency & Country)                    | Accepted | 2026-07-11 |
| 0015 | Repository Implementation Patterns                      | Accepted | 2026-07-11 |
| 0031 | Price alerts with in-app notifications (email deferred) | Accepted | 2026-09-14 |

See [`adr/`](./adr/) for full rationale.
