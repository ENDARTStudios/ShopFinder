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
