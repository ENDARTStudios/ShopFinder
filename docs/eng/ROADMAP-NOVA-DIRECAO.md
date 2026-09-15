# ROADMAP — NOVA_DIRECAO (15/set/2026)

Registro da direção pós-beta com status honesto por item. Legenda:
**FEITO** (entregue neste ciclo) · **SCAFFOLD** (estrutura pronta, falta ativo do
Operador) · **GATED** (aguarda credenciais/decisão externa) · **JÁ EXISTE**
(implementação anterior cobre) · **PLAYBOOK** (documento de ação, não código).

| ID | Item | Status | Entrega / Próximo passo |
|----|------|--------|------------------------|
| A1 | Recomendações personalizadas | **FEITO (v1)** | Strip "Recomendados para você" na home: nicho/marca do histórico local (localStorage) cruza com o catálogo; fallback = mais bem avaliados do nicho. Evolução: server-side com histórico logado. |
| A2 | Histórico de buscas e comparações | **FEITO (v1)** | `src/lib/history.ts` grava views e buscas em localStorage; strip "Vistos recentemente" na home; comparações já persistiam (`shopfinder:compare`). Evolução: sincronizar por conta. |
| A3 | Wishlist por usuário | **FEITO** | API `/api/wishlist` (GET/POST/DELETE, dono, 1/produto) + botão coração no detalhe + seção em `/conta`. Modelo `WishlistItem` já existia no schema (init migration). |
| A4 | Comparação multi-fornecedor | **JÁ EXISTE + GATED** | A comparação já lista ofertas de todos os fornecedores do produto (eBay/Newegg/Amazon/Intel). Novos fornecedores = B1 (credenciais). |
| A5 | App móvel nativo | **PLAYBOOK** | Curto prazo: PWA instalável já cobre (T085). Nativo (RN/Flutter) = projeto dedicado; pré-requisitos: API pública (E2) estável + tração no beta. |
| B1 | Mais fornecedores | **GATED** | AliExpress/Mercado Livre/Magalu — aguarda credenciais (Operador). Conectores base já existem em `packages/infrastructure/src/connectors/`. |
| B2 | Nichos novos | **GATED (conteúdo)** | Estrutura de nichos pronta (categories com nicheId); abrir nicho = decisão de catálogo + cobertura de fornecedores. Playbook: seed por nicho em `scripts/`. |
| B3 | Conteúdo editorial (guias) | **FEITO (v1)** | Seção `/guias` + guia piloto "Como comparar fontes e PSUs"; estrutura data-driven (`src/content/guidas.ts`) para novos guias sem deploy de schema. |
| C1 | Plano pago (Pro) | **SCAFFOLD** | Landing `/pro` (proposta de valor + captura de interesse reusando waitlist). Billing real (Stripe subscriptions) = decisão de preço + DSN/conta — Operador. |
| C2 | Parcerias diretas | **PLAYBOOK** | Não é código. Playbook em `docs/eng/ROADMAP-NOVA-DIRECAO.md` §Parcerias. |
| C3 | Certificação de qualidade | **PLAYBOOK** | Selos externos exigem histórico (Reclame Aqui, Google Safe Browsing, LGPD selo). Roadmap pós-tração. |
| D1 | Moderação humana de reviews | **FEITO + JÁ EXISTE** | Painel `/admin/reviews` (T082: aprovar/remover) + reviews flagged agora aparecem no bell do admin (contagem no painel de notificações). |
| D2 | Beta fechado / testers | **FEITO (v1)** | Waitlist é a lista de convite; página `/beta` com explicação + captura. Convites manuais do Operador no lançamento. |
| D3 | Selos externos | **PLAYBOOK** | Igual C3 — exige tração/histórico. |
| E1 | Extensão de browser | **PLAYBOOK** | Pré-requisito: API pública (E2, entregue v1) estável + CORS revisado. Projeto dedicado (MV3). |
| E2 | API pública para parceiros | **FEITO (v1)** | `GET /api/public/v1/products?q=&limit=` (read-only, campos públicos, rate limit) + docs em `/api-docs`. |
| E3 | Bot Telegram/WhatsApp/Discord | **SCAFFOLD (Telegram)** | Webhook `/api/telegram/webhook` (secret-gated `TELEGRAM_WEBHOOK_SECRET`) com /start e busca básica. Operador: criar bot + setar token/secret + registrar webhook. Discord/WhatsApp na fila. |
| F1 | Observabilidade completa | **GATED (DSN)** | Sentry já está no bundle (`next.config.ts`); ativar = setar `SENTRY_DSN` (Operador) + remover exclusão se OTel for ligado (ver MANUAL §8). |
| F2 | Backup + DR | **FEITO (doc+script)** | `docs/eng/DR-PLAN.md` (Neon PITR + rotina pg_dump + RPO/RTO) e `scripts/db-backup.sh` (template pg_dump via connection string do Operador). |

## Playbook — Parcerias diretas (C2/C3/D3)

1. **Prova de tração** (30-60 dias pós-beta): waitlist convertida, buscas/dia,
   cliques de saída por fornecedor (analytics T077 já mede pageviews; estender
   para outbound clicks).
2. **Material**: one-pager por fornecedor (audiência, nicho, integração via
   connector já existente, modelo de comissão).
3. **Certificações**: LGPD (DPO/relatório), Reclame Aqui (perfil + 90d),
   Google Safe Browsing (automático — monitorar), selos de segurança (exige
   pentest — Strix já no toolbelt, ver AGENT-TOOLBELT.md).
4. **Testers (D2)**: primeiros 50 da waitlist com convite nomeado; canal de
   feedback dedicado; changelog público.

## Próximos ciclos sugeridos (pós-implementação)

1. Sincronizar histórico/wishlist server-side por conta (hoje: wishlist server,
   histórico local).
2. Recomendações server-side com sinais de clique (analytics).
3. WhatsApp/Discord bots (E3 restante) após Telegram validar formato.
