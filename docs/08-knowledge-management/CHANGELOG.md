# CHANGELOG — Convenção e Marcos

> **Histórico completo:** `git log` (Conventional Commits por commit). Changelog estruturado do bootstrap: [`CHANGELOG.md`](../../CHANGELOG.md) na raiz (Keep a Changelog). Este arquivo registra **marcos** do produto, não commits individuais.

## Convenção

- Commits seguem Conventional Commits (`feat:`, `fix:`, `chore:`, `ci:`, `docs:` + ID da tarefa) — o changelog de detalhe é derivável do log.
- Marcos entram aqui quando **fecham uma frente** (feature de usuário, mudança de arquitetura, gate novo) — mesmo PR atualiza este arquivo.
- Formato das entradas: data · título · tasks/commits de referência · impacto para o usuário.

## Marcos

### 2026-09 · Commerce Utility + decisional de compra

- **T100** — Claim público do hero tornado verdadeiro/auditável (CDC art. 37) — `e84361a`
- **T101** — Fundação UI Commerce Utility (light default, PriceBlock, UtilityHeader) + `PriceSnapshot` diário (cron 06:00 UTC) — `1d629b8`
- **T102/T107** — Resultados com filtros (fornecedor/marca/preço/estoque), sort, densidade, tudo em URL-state SSR — `/produtos`
- **T103** — PDP como hub de decisão: PriceBox, histórico com veredito honesto (≥ 7 dias), specs, reviews
- **T104** — Compare bar sticky com validação de slugs e sincronização cross-tab — `f6d8045`
- **T108** — CI: typecheck/lint/unit/knip contra client postgres (fim dos traps sqlite) — `1404e0e`
- **i18n** — Terceiro idioma es-ES completo + seletor — `69ec1c5`

### 2026-08/09 · Plataforma

- Revisão jurídica expandida (LGPD, termos/privacidade/cookies v2) — T053
- Typecheck zerado e gate religado (`ignoreBuildErrors: false`) — T049 `e3f6f1e`
- DigiKey connector mergeado e operacional em produção — T048 `7454eb8`
- NOVA_DIRECAO: 9 de 17 iniciativas (wishlist, histórico local, recomendações, /guias, /pro, API pública, Telegram scaffold, bell admin, DR+backup)

### Anteriores

- Bootstrap de governança + CI/CD — ver [`CHANGELOG.md`](../../CHANGELOG.md) (raiz, 0.1.0)
