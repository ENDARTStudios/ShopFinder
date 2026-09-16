# Pendências do Operador

Fonte da especificação: Thinker (15/set/2026), DECISAO-NOVA-DIRECAO-002.
Ratificação do Doer não substitui ação do Operador — cada item tem dono único.

## 🔴 P0 — bloqueia função em produção (fazer hoje)

### P0-1 · Migration `PriceSnapshot` no Neon PROD
- **Por quê:** o cron diário de snapshot (06:00 UTC) **falha em produção** sem a
  tabela; o histórico de preço (base do gráfico "preço justo agora?") não acumula.
- **Como:** Neon console → SQL Editor → branch **production** → colar o SQL de
  `prisma/migrations/20260915170000_price_snapshot/migration.sql` → Run.
- **Verificar:** `SELECT column_name FROM information_schema.columns WHERE
  table_name='PriceSnapshot';` → deve retornar `id, productId, offerId, supplier,
  priceMinor, currency, capturedAt, capturedDay`.

## 🟠 P1 — secrets/contas que só você cria (esta semana)

### P1-1 · Sentry (`F1`)
- sentry.io → novo projeto (Next.js) → copiar **DSN**.
- Vercel → Environment Variables → `SENTRY_DSN` (Production) → Save → **Redeploy**.
- **Verificar:** erro de teste aparece no Sentry; sem PII nos payloads.

### P1-2 · Telegram (`E3`)
- @BotFather → `/newbot` → copiar token.
- Gerar `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`).
- Vercel (Production): `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` → Save → Redeploy.
- **Depois:** Doer registra o webhook (`setWebhook` → `/api/telegram/webhook`) via tarefa.

### P1-3 · Credenciais de fornecedores (`B1`) — forneça via Vercel env, **nunca no chat**
- **AliExpress:** Open Platform/Affiliates → App Key/Secret.
- **Mercado Livre:** developers.mercadolibre → criar app → client_id/secret.
- **Magalu:** API de parceiro (se houver programa); senão pular.
- **Amazon:** concluir **informações fiscais** do Associates + atingir vendas
  qualificadas → então chaves PA-API (a tag de afiliado já funciona enquanto isso).
- **Newegg:** tracking ID via CJ Affiliate (se quiser).

## 🟡 P2 — decisões de negócio (definem escopo futuro)

### P2-1 · API pública (`E2`)
Manter **pública read-only rate-limited (30/min)** no beta (recomendado) ou tornar
opt-in por token para parceiros? *Recomendação do Thinker: pública agora, token depois.*

### P2-2 · `/pro` (`C1`)
O copy atual diz **"em desenvolvimento — registre interesse"**, **sem preço e sem
promessa de data** (garantido pelo Doer no T105). Decisão de **preço/billing**
(Stripe subscriptions) vem depois, quando houver tração.

### P2-3 · Nichos novos (`B2`)
Escolher quais (ex.: áudio/vídeo, periféricos, armazenamento, redes) — a lista
vai para o Doer importar catálogo.

### P2-4 · Beta fechado (`D2`)
Rodar programa de testers com convites da waitlist **antes** do anúncio público?
Se sim, o Thinker emite tarefa de gate por convite.

### P2-5 · Timing do anúncio
Após T102–T104 (UI) + (opcional) D2.

## ⏸ P3 — playbooks liderados por você (sem ação técnica agora)

`C2` parcerias diretas · `C3` white-label · `D3` certificações · `E1` extensão de
browser · `A5` app nativo. Roadmaps registrados em
`docs/eng/ROADMAP-NOVA-DIRECAO.md`; retomam quando houver tração.

## Itens Concluídos (histórico)
- [x] [1]-[7] Fases 0-5 completas
- [x] [8] Upstash Redis provisionado (T040)
- [x] Migration PriceSnapshot no Neon DEV (T101); PROD pendência P0-1 acima
- [x] Cadastrar APIs de fornecedores (AliExpress/CJdropshipping/DSers) → movido p/ P1-3
- [x] Validar preços de referência do catálogo (T068 import real)
