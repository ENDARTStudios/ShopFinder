# Passo 1: Backup do DECISOES.md atual

Copy-Item DECISOES.md state\DECISOES_PRE_BOOTSTRAP.md

# Passo 2: Gravar o conteúdo EXATO fornecido pelo Thinker

@'

# DECISÕES — ShopFinder

Este arquivo registra decisões de negócio, arquitetura e governança.
Autoria: Thinker (regra do protocolo). O Qwen/Doer apenas grava o que o Thinker entrega; não inventa nem resume conteúdo aqui.

## Negócio / Produto

### DECISAO-PRODUTO-001 — ShopFinder é e-commerce de dropshipping de hardware

ShopFinder é uma loja online (e-commerce) de hardware e tecnologia que opera via dropshipping. O cliente compra na ShopFinder, paga à ShopFinder e recebe o produto; a relação comercial é exclusivamente com a ShopFinder. Fornecedores (AliExpress, Temu, distribuidores, fabricantes) são invisíveis ao cliente. A inteligência de catálogo (coleta, normalização, enriquecimento, validação em 15 estágios, Authority/Coverage) é tecnologia de bastidores, não o produto vendido. Origem: Operador.

### DECISAO-MVP-005 — Escopo do MVP

MVP pronto = vitrine + carrinho + checkout + pagamento + pedido ao fornecedor + tracking. Decomposição: MVP-1 = vitrine + catálogo + busca + página do produto + carrinho + checkout + pagamento + área do cliente (viável já, com catálogo estático). MVP-2 = pedido automático ao fornecedor + tracking + sync de estoque/preço (depende de acesso às APIs dos fornecedores). Origem: Operador + decomposição Thinker.

### DECISAO-MVP-011 — Estratégia de início (opção d)

MVP-1 avança com catálogo estático de produtos reais (seed de ~43 produtos fornecido pelo Thinker, expansível a ~200). A automação de dropshipping (MVP-2) aguarda o acesso às APIs. Origem: Operador.

### DECISAO-ESTOQUE-003 — 100% dropshipping

A ShopFinder não mantém estoque próprio; o fornecedor envia direto ao cliente. Origem: Operador.

### DECISAO-FORNECEDOR-004 — Pedido ao fornecedor via API, zero operador

Após a venda, o pedido ao fornecedor é automático via API (AliExpress Open Platform / DSers / CJdropshipping), sem operação manual. PENDÊNCIA: requer credenciais de API que o Operador ainda não possui (ver PENDENCIAS_OPERADOR.md). Sem elas, o MVP-2 é inviável. Origem: Operador + escalonamento Thinker.

### DECISAO-PAGAMENTO-002 — Gateway

Gateway padrão: Stripe (sem mensalidade, multi-moeda BRL + outras, Pix via Stripe no Brasil). Alternativa: Mercado Pago (Pix nativo, foco LATAM). Esclarecimento: nenhum gateway é 100% gratuito; todos cobram taxa por transação. Gratuito = sem mensalidade/assinatura. Origem: Operador + decisão técnica Thinker.

### DECISAO-MARGEM-006 — Margem dinâmica

Margem configurável por regra (tabela pricing_rules: % por categoria/produto/fornecedor + fallback). Preço final = custo do fornecedor + frete + margem. Origem: Operador + decisão técnica Thinker.

### DECISAO-DEVOLUCAO-007 — Devolução ao fornecedor

O cliente devolve ao fornecedor; a ShopFinder é ponte de compra (coordena a solicitação, não gerencia estoque de devolução). MVP: registro de solicitação + coordenação básica. Origem: Operador.

### DECISAO-UX-008 — Referência de experiência

Combinar o melhor de Kabum (foco técnico/hardware), Amazon (busca, recomendações, reviews, checkout), Pichau e Terabyte (especificações, comparação, compatibilidade). Design system: shadcn/ui + Tailwind v4. Design intelligence: UI UX Pro Max (estilo Minimalism + Aurora UI; paleta e-commerce; tipografia Inter + JetBrains Mono; gráficos Recharts). Animações: Motion.dev (padrão React), GSAP (scroll/timeline), anime.js (micro-interações/stagger). Origem: Operador + decisões técnicas Thinker.

### DECISAO-VOLUME-009 — Escala inicial

Catálogo inicial ~200 produtos (processadores, GPUs, placas-mãe, memórias, SSDs, HDs, fontes, gabinetes, refrigeração, monitores, periféricos, notebooks). Beta fechada 50–100 usuários. Arquitetura escalável para 10k+ produtos e 1k+ usuários sem reescrita. Origem: Thinker (delegado pelo Operador).

### DECISAO-PRAZO-010 — Sem prazo; pronto = beta com clientes reais

Sem prazo fixo. Qualidade > velocidade. Pronto = beta com clientes reais. Origem: Operador.

## Infra / Arquitetura (decisões técnicas vigentes)

### DECISAO-STACK-LEGADO-001 — Stack do core pré-existente

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui no frontend; Neon PostgreSQL + Prisma no banco; NextAuth com cookie httpOnly para auth; Vercel para deploy; Upstash Redis para cache/fila/feature flags; busca textual via tsvector + pg_trgm (PostgreSQL nativo). Confirmado pelo código em src/ e pelos commits reais.

### DECISAO-REDIS-PROVISIONED — Upstash Redis

Upstash Redis (free tier) provisionado pelo Operador e conectado (src/lib/redis.ts; /api/health reporta status). Desbloqueia cache (6.3), fila (6.2) e feature flags (6.7). Origem: Operador.

### DECISAO-SEARCH-POSTGRES — Busca textual nativa

Busca textual com PostgreSQL nativo (tsvector + pg_trgm), sem serviço externo. Justificativa: simplicidade, custo zero, escala suficiente. Origem: Thinker.

### DECISAO-ANIMATION-LIBS — Três bibliotecas de animação

Motion.dev (padrão para componentes React), GSAP (scroll-driven/timelines/SVG), anime.js (micro-interações/stagger). Todas respeitam prefers-reduced-motion. Origem: Operador + Thinker.

### DECISAO-UI_UX_PRO_MAX — Design intelligence normativa

UI UX Pro Max adotado como guia normativo de design (estilo, paleta, tipografia, padrões de landing, diretrizes UX). Origem: Operador.

## Governança / Processo

### DECISAO-RECON-001 — Reconciliação pós-reset

Após hard reset que descartou commits locais: preservar commits do Operador como fonte da verdade; reconstruir governança e features ausentes em tarefas atômicas verificadas no GitHub real; nunca sobrescrever commits do Operador. Origem: Thinker.

### DECISAO-CI-DEBT-001 — Dívida de CI verde (exceção temporária)

O workflow CI (GitHub Actions) está vermelho na main, inclusive para commits anteriores ao bootstrap (falha pré-existente de build/lint/typecheck do core e/ou YAML do ci.yml a corrigir). O deploy real (Vercel) está verde e o teste de integridade do protocolo passa. Decisão: até o CI voltar verde (tarefa dedicada T004), merges de GOVERNANÇA/RECUPERAÇÃO são permitidos como exceção documentada; NENHUM merge de feature de produto acontece com CI vermelho. Risco residual: médio (qualidade). Origem: Thinker (lição aprendida).

### DECISAO-VERIFICACAO-001 — Operador é a fonte de verdade do remote

Como o repositório é privado e o Doer já fabricou evidência, nenhum commit é considerado real sem o Operador confirmar sua presença no GitHub. O Thinker não aprova persistência com base apenas na transcrição do Doer. Origem: Thinker (lição aprendida).

## Pendências de negócio (detalhes em PENDENCIAS_OPERADOR.md)

- Acesso às APIs de fornecedores (AliExpress/DSers/CJdropshipping) para o MVP-2.

## Nota sobre decisões técnicas herdadas

Decisões técnicas das Sprints anteriores (auth, catálogo, pipeline, schema do knowledge graph etc.) que ainda valem estão refletidas no código em src/ e, quando documentadas antes do bootstrap, preservadas em state/DECISOES_PRE_BOOTSTRAP.md. Re-registrar aqui conforme forem relevantes para novas tarefas.

### DECISAO-TAXONOMIA-001 — Subcategorias cooling e mini-pc criadas; correção cirúrgica de categorias (T033)

A auditoria read-only do catálogo (22 produtos, `scripts/audit-categories.ts`) confirmou 2 atribuições erradas originadas no seed: DeepCool AK620 em "Gabinetes" e Minisforum N100 em "Monitores". Decisão: criar as subcategorias `cooling` ("Coolers & Ventoinhas") e `mini-pc` ("Mini PCs") no nicho pc-hardware — rejeitada a alternativa de reaproveitar categoria errada — e corrigir via SQL idempotente (`scripts/fix-categories-sql.ts`: 2 INSERT WHERE NOT EXISTS + 2 UPDATE por SKU, sem DELETE, sem INSERT de produtos, sem tocar SKU/preço/estoque). O `seed-catalog.ts` já nasce corrigido para instalações futuras. Execução em produção é autoridade do Operador (Neon SQL Editor); rollback trivial pelo UPDATE inverso. Origem: Doer (auditoria) / Thinker (aprovação).

### DECISAO-T020B-001 — Causa raiz do pedido não persistido + correção de roteamento Stripe

Diagnóstico (T036-T040): o `STRIPE_SECRET_KEY` de produção apontava para a conta Stripe **velha (MEDIA Rate)** — provado por probe: sessão criada em produção não existia na conta ShopFinder (`No such checkout.session`). Pagamentos eram cobrados na conta errada e o evento `checkout.session.completed` disparava na conta velha, cujo endpoint nunca foi o `/api/webhook` da ShopFinder → 0 orders. Fix (Operador): substituição do valor em Vercel Production + Redeploy. Prova pós-fix (T038): sessão nova lida com a chave ShopFinder → 200. Handler do webhook auditado e funcionando (probe assinado T040 persistiu order `paid`); whsec de produção correto (== .env local, validado por assinatura). O pedido real do teste T039 foi backfillado por replay assinado do evento (order `cs_test_a1aBlaw...` status `paid`). Pendência operacional residual: confirmar no dashboard ShopFinder que a URL do endpoint webhook é `https://shop-finder-taupe.vercel.app/api/webhook` e inspecionar 1 linha do Runtime Logs — garante que futuros pagamentos reais persistam automaticamente. Origem: Doer (diagnóstico) / Thinker (matriz de decisão) / Operador (higiene da conta e execução Vercel).

### DECISAO-T041-001 — Entrega automática do Stripe confirmada (fecha a saga do Order)

Após habilitar `checkout.session.completed` no endpoint ShopFinder (causa raiz do gap: o endpoint só assinava eventos de billing/`payment_intent.*`), o pagamento teste `4242…` (sessão `cs_test_a1R2AB9q…`, US$ 21,99) foi processado e a Order **persistiu sozinha** via entrega automática do Stripe — sem replay manual (`check-orders.ts`: 3 orders `paid`, nova em 19:36 UTC de 30/08/2026). A loja vende, cobra na conta certa, registra sozinha e mostra o pedido ao cliente. Evidência: probe de roteamento (T038) + entrega automática (T041). Origem: Doer (execução) / Thinker (diagnóstico) / Operador (config do dashboard).

### DECISAO-T059-001 — Publicação do pacote jurídico v2.0 (pt/en/es)

Em 01/09/2026 foi publicado o pacote jurídico v2.0 (Parecer + Achados + minutas Termos v2.0 com 23 seções e Privacidade v2.0 com 16 seções), revisado pelo Thinker e autorizado pelo Operador. Fontes commitadas em `docs/legal/termos-de-uso-v2.md` e `docs/legal/politica-de-privacidade-v2.md` (verbatim); conteúdo publicado vive em `messages/*.json` (`terms.sections` 24 itens / `privacy.sections` 17 itens, incl. "Referências normativas"), com renderização multiparágrafo (`body: string | string[]`) e intro na Privacidade. /cookies v1.1 sem consentimento tácito e com tabela completa de storage (commit 55775b3). Paridade i18n 609 chaves × 3 locales.

Tabela de placeholders (decisões do Thinker):

| Placeholder | Valor |
|---|---|
| `[DIA] de [MÊS] de 2026` | 1 de setembro de 2026 (EN: September 1, 2026 · ES: 1 de septiembre de 2026) |
| Versão | 2.0 |
| `[X] dias úteis` (confirmação) | 2 (coerente com o SAC já publicado) |
| `[preencher endereço completo]` | Osasco, São Paulo - Brasil (PENDÊNCIA OPERADOR: complementar rua/número) |
| `[e-mail do encarregado]` / canal privacidade | endart.studios@gmail.com |
| `[canal de cancelamento]` | botão no pedido em /conta/pedidos ou endart.studios@gmail.com (botão vem na T061) |

Preenchimentos adicionais feitos pelo Doer (coerentes com dados públicos, a ratificar): `[canal jurídico]` = endart.studios@gmail.com (único canal existente); `[entidade e país]` (§6 Privacidade) = Stripe, Inc. / Vercel, Inc. / Neon, Inc. / OpenAI — Estados Unidos; `[prazo]` (retenção de conta pós-encerramento) = até 180 dias (estrutura de governança, ajustável). PENDÊNCIA: `termsVersion: "1.0"` hardcoded em `src/app/api/auth/register/route.ts` — aceites pós-publicação seguem gravando "1.0" até decisão do Thinker (rota fora do escopo do T059). Origem: Thinker (minutas + tabela) / Doer (publicação e preenchimentos residuais) / Operador (endereço completo).

### DECISAO-T067-001 — Revisão dos Termos de Uso v2.0 (26 seções) com marco de PI e uso de IA

Em 02/09/2026 os Termos de Uso publicados foram substituídos pela revisão v2.0 (26 seções + referências normativas), que incorpora a cláusula de Propriedade Intelectual (§15, com 15.1) e as Diretrizes de uso de IA (§16) fornecidas pela operação. Principais mudanças vs. a minuta de 31/08: 1) §1 declara expressamente que a operadora **não possui endereço físico** e que "Osasco, São Paulo — Brasil" é *localização informada* — resolve a pendência de rua/número para os Termos (permanece para §1 da Privacidade); 2) §15/§16 endurecem PI e IA (proibição de scraping/treinamento de modelos concorrentes, prompt injection, extração de prompts); 3) §23 remove referências condicionais de arbitragem nos EUA — termos agora neutros (lei brasileira); 4) §6 mantém a proibição de "em tempo real"/"preço real"/"estoque garantido" e consolida BRL prioritário. Minuta anterior preservada em `docs/legal/termos-de-uso-v2-20260831.md`; nova fonte em `docs/legal/termos-de-uso-v2.md`. Migrations T051 e T061 foram APLICADAS em PRODUÇÃO em 31/08/2026 (validadas por information_schema) e retiradas das pendências do MANUAL_DO_OPERADOR.md. Pendências restantes: endereço para §1 da Privacidade e revisão jurídica por advogado. `termsVersion` segue "2.0" (CURRENT_TERMS_VERSION inalterado). Origem: Operador (minutas) / Doer (publicação pt/en/es) / Thinker (ratificação).
