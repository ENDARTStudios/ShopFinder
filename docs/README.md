# Project Documentation

This directory holds all architectural documentation for the Dropshipping Platform.

## Structure

```
docs/
├── README.md            ← you are here
├── architecture.md      ← high-level architecture overview
├── decisions.md         ← summary index of all ADRs
└── adr/                 ← Architecture Decision Records
    ├── 0001-modular-monolith.md
    ├── 0002-monorepo-workspaces.md
    ├── 0003-sandbox-constraints-adaptation.md
    └── 0004-ai-layer-decoupled.md
```

## ADR Convention

- One file per decision, numbered `NNNN-kebab-case-title.md`.
- Format: `Status · Context · Decision · Consequences · Alternatives`.
- Once accepted, an ADR is immutable. To supersede, write a new ADR referencing the prior one.

## Working Doc vs ADR

- `architecture.md` describes **how the system is built today** — it evolves freely.
- `adr/*.md` records **why a decision was made** — it never changes after acceptance.

## Reading Order

1. `architecture.md` — overall picture
2. `decisions.md` — short index of decisions
3. `adr/0001` → `adr/0004` — rationale behind each major choice
