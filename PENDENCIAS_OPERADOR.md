# Pendências do Operador

Fonte da especificação: Thinker (15/set/2026), DECISAO-NOVA-DIRECAO-002.
**Sincronizado em 16/set/2026** com o estado confirmado pelo Operador
(adendo do T105: screenshot Neon + decisões registradas).

## ✅ Fechadas / decididas

### P0-1 · Migration `PriceSnapshot` no Neon PROD — ✅ FECHADO (15/set)

- Aplicada no branch **production** via SQL Editor; guards idempotentes
  (`IF NOT EXISTS` / `EXCEPTION WHEN duplicate_object`) confirmados por
  screenshot; colunas `…capturedAt, capturedDay` presentes.
- Cron diário de snapshot (06:00 UTC) **operacional** — histórico de preço
  acumulando desde 15/set (alimenta o indicador "preço justo agora?" do T103).

### P1-1 · Sentry (`F1`) — ✅ FECHADO

- `SENTRY_DSN` setado em Vercel (Production) + redeploy feito.

### P2-2 · Copy do `/pro` (`C1`) — ✅ FECHADO

- Copy honesta aprovada: "em desenvolvimento — registre interesse", sem preço e
  sem promessa de data; guarda verificável por grep (T105).

### P2-4 · Beta fechado (`D2`) — ✅ ADIADA (decisão)

- Beta fechado com convites da waitlist **adiado**: retomar pós T102–T104 +
  maturação do produto. Registrado em `DECISAO-NEGOCIO-D2-001` (DECISOES.md).

## 🟠 Em processo

### P1-2 · Telegram (`E3`) — 🟡 PARCIAL

- ✅ `TELEGRAM_WEBHOOK_SECRET` setado.
- ⏳ Pendente: **`TELEGRAM_BOT_TOKEN`** (BotFather) → depois o Doer registra o
  webhook (`setWebhook` → `/api/telegram/webhook`) via tarefa.

### P1-3 · Credenciais de fornecedores (`B1`) — 🟡 EM_PROCESSO

- Forneça via Vercel env, **nunca no chat**:
  - **AliExpress:** Open Platform/Affiliates → App Key/Secret.
  - **Mercado Livre:** developers.mercadolibre → criar app → client_id/secret.
  - **Magalu:** API de parceiro (se houver programa); senão pular.
  - **Amazon:** informações fiscais do Associates + vendas qualificadas → chaves
    PA-API (a tag de afiliado já funciona enquanto isso).
  - **Newegg:** tracking ID via CJ Affiliate (se quiser).

## 🟡 Aguardando decisão do Operador

### P2-1 · API pública (`E2`) — AGUARDANDO_DECISAO

- **Onde está:** docs para parceiros em `/api-docs`; endpoint
  `GET /api/public/v1/products?q=&limit=` (read-only, campos públicos);
  rate limit **30/min/IP**; teste: `curl
"https://shop-finder-end-art-studios.vercel.app/api/public/v1/products?limit=2"`.
- **Decisão:** manter **pública read-only rate-limited (30/min)** no beta
  (recomendação do Thinker: `MANTER-PUBLICA`) ou tornar opt-in por token
  (`GATEAR-TOKEN`) para parceiros.

### P2-3 · Nichos novos (`B2`) — ABERTA

- Escolher quais (ex.: áudio/vídeo, periféricos, armazenamento, redes) — a lista
  vai para o Doer importar catálogo.

### P2-5 · Timing do anúncio — ABERTA

- Após T102–T104 (UI redesign completo) + (opcional) D2.

### P1-4 · Subprocessadores: especificação contratual — ABERTA (auditoria 29/09, achados PRIV-01/TRANS-01)

- Política cita Sentry/Stripe/Vercel/Neon genericamente; faltam entidade contratada, país, mecanismo de transferência e DPA de cada um. Ação do Operador/jurídico: reunir DPAs vigentes e devolver à Política (docs v2).

### P2-6 · Encarregado (DPO): designação ou dispensa — ABERTA (achado DPO-01)

- Canal de privacidade existe (`endart.studios@gmail.com`); falta designação formal OU decisão documentada de dispensa por porte (Res. CD/ANPD nº 2/2022, pequeno porte).

### P2-7 · Modelo comercial: alinhar Termos ao fluxo real — ABERTA (achados CDC-01/CDC-02)

- Termos dizem "fornecedor vende/entrega/garante"; código cria Checkout Session própria na Stripe e registra Order no banco (participação direta). Decisão jurídica necessária: comparador × intermediário × vendedor de registro. Derivado técnico (força BRL no checkout): issue de tracking da auditoria.

## ⏸ P3 — playbooks liderados por você (sem ação técnica agora)

`C2` parcerias diretas · `C3` white-label · `D3` certificações · `E1` extensão
de browser · `A5` app nativo. Roadmaps registrados em
`docs/01-product-discovery/ROADMAP.md`; retomam quando houver tração.

## Histórico (fechados em ciclos anteriores)

- [x] [1]-[7] Fases 0-5 completas
- [x] [8] Upstash Redis provisionado (T040)
- [x] Validar preços de referência do catálogo (T068 import real)
- [x] Migration PriceSnapshot no Neon DEV (T101)
