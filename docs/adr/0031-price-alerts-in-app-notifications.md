# ADR 0031 — Alertas de preço com notificação in-app (email adiado)

- **Status:** Accepted
- **Data:** 2026-09-14
- **Relaciona:** T083 · DECISAO-ANALYTICS-001 · REC-005 (bell de notificações)

## Contexto

T083 pede "alerte-me quando o preço cair até R$ X". Notificação por email
exigiria provisionar um terceiro (Resend/SES) + domínio verificado + segredo
novo na Vercel — decisão do Operador, fora do escopo do ciclo.

## Decisão

1. **Notificação in-app**: o alerta disparado grava em `Notification`
   (server, persistente) e aparece no bell + em `/conta`. Sem cookie, sem
   terceiro; o `readAt` de exibição continua client-side (padrão REC-005).
2. **Fonte do preço no cron**: o cron compara o alvo com o **melhor preço de
   oferta corrente do catálogo** (`ProductOffer`), convertido para BRL minor
   pela mesma taxa server-side exibida na UI (`fx-server`, cache 1h). O cron
   **não chama APIs de fornecedor**: auth/credentials/rate-limit ficam na
   camada de sync dos conectores (DigiKey/eBay/…), que é quem atualiza as
   ofertas. Quando o worker de sync (RF-3) existir, o cron passa a disparar
   refresh por produto antes de comparar — a superfície
   (`/api/cron/price-alerts`) não muda.
3. **Unicidade parcial**: 1 alerta **ativo** por (produto, customer) via
   índice único parcial no Postgres (`WHERE status = 'active'`) — o Prisma não
   expressa índice parcial, então a constraint vive na migration. Alertas
   `triggered`/`disabled` não impedem um novo alerta.
4. **Idempotência**: o cron só processa alertas `active`; disparo marca
   `triggered` + `triggeredAt` na mesma transação da Notification.
5. **Segurança do cron**: `Authorization: Bearer $CRON_SECRET`, falha fechada
   se o segredo não estiver configurado; batch de 50 alertas por run;
   limite de 20 alertas ativos por usuário na API.

## Consequências

- Operador precisa definir `CRON_SECRET` na Vercel (Production) — o
  `vercel.json` já agenda o cron diário (13:00 UTC / 10:00 BRT).
- Email continua na fila como evolução natural: a troca é adicionar um
  dispatcher no ponto de disparo (mesma transação já isola o evento).
