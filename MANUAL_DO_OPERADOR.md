# MANUAL DO OPERADOR — ShopFinder

Runbook de operação da plataforma ShopFinder. Público-alvo: o Operador, que
valida entregas, administra deploy, banco, segredos e monitoramento **sem
depender de engenharia**.

> Este manual unifica o documento original do Operador (validação de entregas
> do Doer) com o runbook de operação (T066). Regra de ouro: **código segue o
> fluxo de Issue → Branch → PR (AGENTS.md)** — nenhuma mudança de código é
> feita pelo Operador direto em produção.

---

## 1. Papel e validação de entregas

Você é o Operador do projeto ShopFinder, responsável por validar e supervisionar
o trabalho autônomo (fluxo Doer → Thinker → Operador).

Responsabilidades:
1. Validar commits no GitHub real.
2. Confirmar que features estão funcionando em produção.
3. Responder perguntas objetivas sobre o estado do projeto.
4. Operar deploy, banco e segredos conforme as seções abaixo.

Como validar um commit:
1. Acesse https://github.com/ENDARTStudios/ShopFinder
2. Verifique se o hash reportado existe (`git show --stat <hash>`).
3. Confira os arquivos modificados e se a evidência bate com o relatório.

Comandos úteis:
```bash
git log --oneline -5
git show --stat <hash>
git remote -v
```

---

## 2. Visão geral

**O que é:** vitrine comparadora de componentes de informática e eletrônicos
(catálogo, busca, comparação, carrinho, checkout Stripe, área do cliente) com
integrações de fornecedores (DigiKey, eBay) e legalidade consumerista BR
publicada (/termos v2.0, /privacidade v2.0, /cookies).

**Arquitetura (quem faz o quê):**

| Peça | Serviço | Papel |
|---|---|---|
| App | **Next.js na Vercel** | SSR/ISR, rotas de API (`/api/*`), i18n por cookie (pt-BR/en/es-ES) |
| Banco | **Neon (Postgres)** | Prisma (`prisma/schema.prisma`); dev usa um Neon, PRODUÇÃO usa OUTRO Neon |
| Pagamento | **Stripe** | Checkout hospedado; webhook grava Orders automaticamente |
| Fornecedores | **DigiKey / eBay** | Conectores de busca (OAuth2); chaves por ambiente |
| Cache/rate limit | **Upstash Redis** | Rate limiting das rotas de API (fallback em memória) |

**URL de produção:** `https://shop-finder-taupe.vercel.app`
**Webhook Stripe:** `https://shop-finder-taupe.vercel.app/api/webhook`

Docs de engenharia: `docs/eng/` (PRD, ARCHITECTURE, SECRETS, SECURITY, RLS,
OBSERVABILITY, TESTING). Decisões: `DECISOES.md` na raiz.

---

## 3. Deploy (Vercel)

- **Publicação automática:** todo push/merge em `main` dispara deploy de
  produção. Não existe passo manual.
- **Ver deploys:** Vercel → projeto → aba **Deployments**. O deploy mais recente
  mostra commit, branch e status (Building → Ready/Error).
- **Forçar Redeploy** (obrigatório após trocar variável de ambiente):
  Deployments → último deploy "Ready" → menu **⋯ → Redeploy** → confirmar
  **"Use existing build cache" desmarcado** quando a troca for de variável.
- **Ver logs:** Deployments → abrir o deploy → **Build Logs** (erro de build) ou
  aba **Runtime Logs** (erro em execução, por rota/status). Erro 500 recorrente
  aparece lá com stack.
- **Domínios:** Settings → Domains. Não alterar sem registro em DECISOES.md.

---

## 4. Banco (Neon)

**Importante:** existem DOIS bancos — o **Neon de dev/testes** (o `DATABASE_URL`
do `.env` local, usado por Doer/scripts) e o **Neon de PRODUÇÃO** (que a Vercel
usa). Confira sempre em qual console está antes de rodar SQL.

**Rotina de migration ADITIVA (padrão do projeto):**

1. Abra o console Neon do banco alvo → **SQL Editor**.
2. Abra o arquivo `prisma/migrations/<timestamp>_<nome>/migration.sql` no repo.
3. Confira no topo do arquivo: migrations novas do projeto são **idempotentes**
   (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) — podem ser reexecutadas sem
   dano. Exceção histórica: `20260830193000_terms_acceptance` (T051) **não** é
   idempotente — rode **uma única vez**.
4. Cole e execute o SQL.
5. **Valide** com `information_schema`, ex.:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Order' AND column_name LIKE 'cancellation%';
```

6. Registre a aplicação em `DECISOES.md` (ou avise o Doer para registrar).

**Migrations aplicadas em PRODUÇÃO (registro):**
- `20260830193000_terms_acceptance` (T051 — colunas de aceite no `User`) —
  **APLICADA em 31/08/2026**, validada por `information_schema`.
- `20260831150000_cancellation_request` (T061 — colunas de arrependimento no
  `Order`) — **APLICADA em 31/08/2026**, validada por `information_schema`.
- Próximas migrations do repo devem seguir o padrão idempotente
  (`ADD COLUMN IF NOT EXISTS`) e entrar nesta lista após aplicação.

**Proibições:** NUNCA executar `DROP`, `TRUNCATE`, `DELETE` em massa ou `UPDATE`
sem `WHERE` em produção. Qualquer correção de dados passa pelo Doer/Thinker e
vira script commitável (padrão: `scripts/fix-categories-sql.ts`).

---

## 5. Rotinas de verificação (scripts)

Todos rodam da raiz do repo com `bun scripts/<script>.ts`, lendo o `.env` local
(Neon de dev/testes, exceto onde indicado). Nenhum exige segredo além do `.env`.

| Script | O que prova | Saída esperada |
|---|---|---|
| `bun scripts/check-orders.ts` | Orders estão sendo gravadas (webhook funcionando). **SELECT apenas**, sem PII. | Lista de orders (number/status/total/data). Referência: 3 orders `paid` de 30/08/2026. Uma compra nova deve aparecer aqui em segundos. |
| `bun scripts/check-i18n-parity.ts` | Os 3 locales têm as mesmas chaves (pt-BR = base). | `paridade total ✓ (2 locales vs base pt-BR)` e exit 0. Exit 1 lista chaves ausentes/extras por locale. |
| `bun scripts/test-digikey-connector.ts` | Conector DigiKey real funciona (OAuth2 + rotas v4), sem banco. | Count normalizado + 2 títulos + 1 preço + 1 partNumber (ex.: busca STM32 → 6503 itens). |
| `bun scripts/test-ebay-smoke.ts` | OAuth2 e busca do eBay no ambiente de `EBAY_ENV`. | Token 200 + busca 200 com total. Produção: ~129.600 itens. |
| `bun scripts/audit-categories.ts` | Categorias dos produtos estão coerentes. **READ-ONLY**, não escreve. | Lista produto → categoria atual → sugerida. Divergências viram issue para o Doer. |
| `bun scripts/probe-webhook.ts` | Diagnóstico do webhook Stripe: assina um evento `checkout.session.completed` sintético com o `STRIPE_WEBHOOK_SECRET` local e POSTa no endpoint de produção. | Grava 1 order identificável (`cs_test_probe_shopfinder`) VIA o próprio webhook. **Uso diagnóstico apenas** — confirme depois com `check-orders.ts`. |

Frequência sugerida: `check-orders` após cada campanha/pagamento teste;
`test-digikey-connector` e `test-ebay-smoke` semanais ou ao suspeitar de quebra
de API de fornecedor; `check-i18n-parity` após qualquer mudança de conteúdo.

---

## 6. Segredos

**Onde vivem:** Vercel → projeto → **Settings → Environment Variables**
(produção) e o `.env` local (dev). Referência canônica de nomes/propósito:
`docs/eng/SECRETS.md` e `.env.example` (valores vazios).

**Nomes em uso (apenas nomes — valores NUNCA em código, commit ou chat):**
`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
`DIGIKEY_CLIENT_ID`, `DIGIKEY_CLIENT_SECRET`, `DIGIKEY_ENV`,
`EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_ENV`.

**Como trocar uma chave:**

1. Gere a nova no dashboard do provedor (Stripe/eBay/DigiKey/Neon).
2. Vercel → Settings → Environment Variables → edite a variável → Save.
3. **Redeploy** — variável só vale após novo deploy.
4. Valide com o script correspondente (§5) e/ou uma compra teste.

**Regra "substituir, não criar `_2`":** sempre **edite a variável existente**.
Criar `STRIPE_SECRET_KEY_2` (ou nome paralelo novo) deixa o código lendo a
antiga e é causa provada de incidente — pagamento caindo em conta errada
(DECISAO-T020B-001). Para rollback, restaure o valor antigo na MESMA variável.

**Rotação:** Stripe — criar chave nova no dashboard, substituir na Vercel,
revogar a antiga só depois de validar. Webhook secret — re-gerar no endpoint do
Stripe e substituir `STRIPE_WEBHOOK_SECRET` (Redeploy).

---

## 7. Dashboards de terceiros

| Dashboard | O que olhar |
|---|---|
| **Stripe** | Developers → **Webhooks**: endpoint `https://shop-finder-taupe.vercel.app/api/webhook` ativo e **evento `checkout.session.completed` habilitado** (além dos eventos de pagamento) — a ausência desse evento já causou outage de gravação de orders (T041). Aba de entregas do webhook: 200 em tempo real. Payments: cobranças e conta destinatária correta. |
| **eBay** | Developer Account: keysets por ambiente (produção × sandbox) e exemption/autorização. Combo atual: keyset de produção usado nos dois hosts, `EBAY_ENV=production`. Erro de token aqui = `test-ebay-smoke` falha. |
| **DigiKey** | API Console: client ativo, quota de requisições, validade do OAuth2. `test-digikey-connector` é o canário. |
| **Neon** | Console do banco de PRODUÇÃO: consumo do plano, branches e o SQL Editor (§4). Confira SEMPRE o nome do projeto antes de rodar SQL. |
| **Vercel** | Deployments (status/erro), Runtime Logs (500s), Settings → Environment Variables (inventário de segredos), Domains. |
| **Amazon (afiliados/PA-API)** | Affiliate Central: relatório de cliques/vendas pela tag `shopfinder01-20` (`AMAZON_ASSOCIATE_TAG`). **PA-API de Produto só após 3 vendas qualificadas em 180 dias** — quando atingir, requisitar acesso no Affiliate Central e abrir issue para o Doer integrar (hoje não há PA-API no código; as 22 ofertas Amazon do seed são o catálogo). |

---

## 8. Limpeza de Functions Storage (deployments)

A Vercel retém o bundle serverless de **cada deployment** (~centenas de MB cada
— Prisma engine + dependências traçadas). Sem limpeza, o "Functions Storage"
acumula GB (pico histórico: 8,74 GB em ~29 deployments).

**Rotina (2 min, libera GB na hora, sem afetar o site):**

1. Vercel → projeto `shop-finder` → aba **Deployments**.
2. Para cada deployment antigo: menu **⋯ → Delete**. Confirme.
3. **Nunca delete** o deployment de produção atual nem os 2–3 mais recentes
   (são seu rollback imediato).
4. Frequência sugerida: **semanal**, ou após rajadas de commits (cada push
   cria um deployment novo).
5. Confira em **Settings → Usage** o gráfico de Functions Storage cair.

Complemento técnico (T070): o bundle por deployment foi reduzido excluindo do
traçado serverless a stack OTel + bullmq (peso morto sem
`OTEL_EXPORTER_OTLP_ENDPOINT`) — ver `next.config.ts`
(`outputFileTracingExcludes`). **Se um dia a observabilidade OTel for
ativada, remover essas exclusões e redeployar** (Sentry permanece no bundle).

## 9. Incidentes básicos

**Site fora / 500 geral**
1. Vercel → Deployments: o último deploy está `Ready`? Se `Error`: abrir Build
   Logs, identificar o commit que quebrou e fazer rollback (promover o deploy
   anterior) + abrir issue para o Doer.
2. Deploy OK mas site fora: Runtime Logs da rota raiz; conferir se o Neon está
   de pé (console) — app sem banco erra nas rotas dinâmicas.

**Compra feita e order não aparece**
1. Stripe → Webhooks: a entrega do evento retornou 2xx? Se há falhas, conferir
   endpoint e segredo.
2. `bun scripts/check-orders.ts` — order ausente confirma o sintoma.
3. `bun scripts/probe-webhook.ts` — se a order-probe gravar, o webhook está OK
   e o problema foi na sessão/compra; se não gravar, investigar o endpoint.
4. O evento `checkout.session.completed` está habilitado no endpoint do Stripe?
   (causa raiz histórica — T041.)

**Pagamento caiu na conta errada**
1. Stripe → Payments: conferir a conta destinatária do pagamento.
2. Vercel → Environment Variables: a `STRIPE_SECRET_KEY` aponta para a conta
   certa? (incidente real: chave antiga de outra empresa — DECISAO-T020B-001).
3. Substituir (nunca criar `_2`), Redeploy, revalidar.

**Fornecedor (DigiKey/eBay) sem resultados**
1. Rodar o smoke do fornecedor (§5).
2. Conferir o dashboard do provedor (quota/expiração/keyset) e o `*_ENV`
   (`DIGIKEY_ENV` / `EBAY_ENV`).

**Preço em BRL estranho / câmbio**
O câmbio USD→BRL é client-side (cache de 1 h em `sessionStorage`, fonte
awesomeapi.com.br). Não há configuração do Operador; falha da fonte cai no
fallback documentado no código.

---

## 10. Pendências do Operador

1. **Endereço completo** (rua/número) para §1 da Política de Privacidade —
   hoje "Osasco, São Paulo - Brasil" nos 3 locales (`messages/*.json`) e em
   `src/config/company.ts`. **Nos Termos de Uso não há mais pendência**: a
   revisão de 02/09/2026 (26 seções) passou a declarar expressamente que a
   operadora não possui endereço físico de atendimento e que "Osasco, São
   Paulo — Brasil" é *localização informada*, não endereço postal. Ao obter
   endereço para a Privacidade, abrir issue para o Doer.
2. **Revisão jurídica por advogado** do pacote v2.0 (Termos/Privacidade/Cookies)
   **antes de anunciar publicamente** — os preenchimentos residuais estão
   registrados em `DECISOES.md` (DECISAO-T059-001 e DECISAO-T067-001) para
   ratificação.

*(Migrations T051 e T061 foram aplicadas em PRODUÇÃO em 31/08/2026 e saíram
desta lista — ver registro no §4.)*
