# PRD — Product Requirements Document

> Reorganização 2026-09 (#79): arquivo fundido a partir de fontes separadas. Conteúdo de cada fonte preservado verbatim como "Parte N".

---

## Parte — PRD

> **Fonte canônica:** [`docs/01-product-discovery/PRD.md`](../01-product-discovery/PRD.md) (v1.0, 2026-08-15, owner ENDART Studios).
> Este arquivo é a camada de entrada; requisitos completos vivem na parte canônica deste arquivo.

## Produto

**ShopFinder** — comparador de preços de hardware/eletrônicos com preços em BRL (cotação ao vivo), agregando ofertas de marketplaces (eBay, AliExpress, Amazon, Newegg, DigiKey, fabricantes). Fornecedores são invisíveis ao cliente final (DECISAO-PRODUTO-001); pedidos são repassados ao fornecedor mais barato após pagamento Stripe.

Direção atual (desde T100/T101, set/2026): **"Commerce Utility"** — utilidade de compra sóbria, claims públicos somente com prova (CDC art. 37).

## Personas (resumo)

| Persona                   | Necessidade-chave                 |
| ------------------------- | --------------------------------- |
| Comprador (guest/cliente) | Buscar, comparar, comprar em BRL  |
| Admin de loja             | Catálogo, pedidos, pipeline       |
| Operador de integrações   | Conectores, SyncJobs, credenciais |
| Superadmin                | Cross-store, flags, segurança     |

Detalhe e anti-personas: [DEFINE_THE_USER.md](DEFINE_THE_USER.md).

## Requisitos por área (highlights)

- **RF-1 Descoberta:** busca full-text (MiniSearch), PDP `/produtos/[slug]`, compare `/compare`, BRL ao vivo (`src/lib/fx.ts`), filtros (T102/T107: supplier/marca/preço/estoque + sort + densidade via URL-state).
- **RF-2 Checkout:** cart Zustand, Stripe Checkout Session, webhook `checkout.session.completed` idempotente (provado T020b/T041).
- **RF-3 Pipeline:** conectores + SyncJob/SyncExecutionLog, histórico de preço (`PriceSnapshot` diário, cron 06:00 UTC), dashboard `/admin/pipeline`.
- **RF-4 Identidade:** NextAuth Credentials+JWT, RBAC `resolvePermissions`, multi-tenant por `Store`.
- **RF-5 i18n:** next-intl, pt-BR/en/es-ES (cookie `locale`).

## Não-funcionais

LCP < 2.5s · uptime 99.9% · RLS + HSTS/CSP + rate limiting · Sentry-ready · cobertura ≥ 60% (90% domínio) · CWV "Good". Detalhe: `docs/01-product-discovery/PRD.md` §4.

## Métricas de sucesso

Conversão checkout ≥ 1.5% · cobertura ≥ 60% (sobe p/ 80% por módulo) · < 1% webhooks com erro após 3 tentativas · p95 API < 400ms.

## Fora de escopo (v1)

Marketplace 3ºs com checkout próprio · NFe automática · apps nativos.

## Como manter

Mudança de requisito = editar `docs/01-product-discovery/PRD.md` (canônico) e atualizar o resumo aqui no mesmo PR. Feature nova entra primeiro no PRD, depois no código.

---

## Parte — PRD

**Produto:** ShopFinder — Global Dropshipping Platform (hardware de computador)
**Versão:** 1.0 · **Data:** 2026-08-15 · **Owner:** ENDART Studios

## 1. Visão

Uma plataforma de e-commerce de dropshipping de hardware onde **fornecedores são invisíveis ao cliente final** (DECISAO-PRODUTO-001). O ShopFinder agrega ofertas de marketplaces (eBay, AliExpress, Amazon, Newegg, DigiKey, fabricantes), expõe um catálogo único com preço em BRL (cotação ao vivo) e repassa pedidos automaticamente ao fornecedor mais barato após o pagamento via Stripe.

## 2. Personas

| Persona                       | Descrição                         | Necessidades                                                 |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------ |
| **Comprador (Guest/Cliente)** | Entusiasta/comprador de hardware  | Buscar, comparar, comprar com preço em BRL e checkout Stripe |
| **Admin de loja**             | Operador da Store                 | Gerenciar catálogo, pedidos, pipeline de sincronização       |
| **Operador de integrações**   | Mantém conectores de fornecedores | Monitorar SyncJobs, credenciais, erros                       |
| **Superadmin (plataforma)**   | ENDART                            | Gestão cross-store, flags, segurança                         |

## 3. Requisitos funcionais

### RF-1 Catálogo & Descoberta

- RF-1.1 Busca full-text (MiniSearch) com mini-search-box na header.
- RF-1.2 Página de produto `/produtos/[slug]` com mídia, atributos, variants e produtos compatíveis.
- RF-1.3 Comparação de produtos (`/compare`) ilimitada entre produtos.
- RF-1.4 Preços convertidos para BRL com cotação ao vivo (`src/lib/fx.ts`), cache em Redis.
- RF-1.5 Filtros por categoria, atributo e faixa de preço.

### RF-2 Carrinho & Checkout

- RF-2.1 Cart drawer lateral persistente (Zustand + localStorage).
- RF-2.2 Checkout Session via Stripe (`/api/checkout-session`).
- RF-2.3 Webhook `checkout.session.completed` idempotente cria Order + OrderItems resolvendo a oferta mais barata por SKU.
- RF-2.4 Páginas de sucesso/cancelamento com recuperação de status.

### RF-3 Pipeline de Fornecedores

- RF-3.1 Conectores: aliexpress, amazon, digikey, ebay, newegg, manufacturers.
- RF-3.2 SyncJob com SyncExecutionLog (auditoria de cada execução).
- RF-3.3 ProductOffer com histórico de preço (ProductOfferPriceHistory).
- RF-3.4 Dashboard `/admin/pipeline` com status.

### RF-4 Identidade & Acesso

- RF-4.1 Registro/login Credentials + JWT (NextAuth), bcrypt.
- RF-4.2 RBAC multi-role (ver `RBAC.md`) com `resolvePermissions`.
- RF-4.3 Multi-tenancy por `Store` (storeId na sessão).

### RF-5 Internacionalização

- RF-5.1 next-intl, locale default pt-BR, catálogo de mensagens em `messages/`.

## 4. Requisitos não-funcionais

| ID    | Categoria       | Meta                                                                                         |
| ----- | --------------- | -------------------------------------------------------------------------------------------- |
| RNF-1 | Performance     | LCP < 2.5s em 4G; skeletons em toda rota assíncrona                                          |
| RNF-2 | Disponibilidade | 99.9%; webhook idempotente e resiliente (Outbox)                                             |
| RNF-3 | Segurança       | RLS no Postgres, headers HSTS/CSP, rate limiting, WAF + Bot Fight (ver `SECURITY.md`)        |
| RNF-4 | Observabilidade | Error boundary + captura de erros (Sentry-ready), logs estruturados (ver `OBSERVABILITY.md`) |
| RNF-5 | Qualidade       | Testes unit/integração/E2E com Codecov (ver `TESTING.md`)                                    |
| RNF-6 | SEO             | Core Web Vitals "Good"; sitemap/robots/JSON-LD (ver `SEO-AEO-AIO-GEO.md`)                    |
| RNF-7 | UX/Motion       | Sistema de motion consistente (ver `MOTION-SYSTEM.md`)                                       |

## 5. Fora de escopo (v1)

- Marketplace de vendedores terceiros com checkout próprio.
- Faturamento fiscal automático (NFe).
- Apps mobile nativos.

## 6. Métricas de sucesso

- Taxa de conversão checkout ≥ 1.5%.
- Cobertura de testes ≥ 60% (gate sobe gradualmente para 80% por módulo).
- < 1% de webhooks Stripe processados com erro após 3 tentativas.
- Uptime 99.9% / p95 de API < 400ms.

## 7. Riscos

| Risco                            | Mitigação                                                               |
| -------------------------------- | ----------------------------------------------------------------------- |
| Depreciação de API de fornecedor | Camada de transporte + connector versionado (`packages/infrastructure`) |
| Flutuação cambial                | Cotação ao vivo com TTL curto + margem configurável                     |
| Chargebacks Stripe               | Idempotência + PaymentRefund modelado                                   |
| Vazamento de dados cross-store   | RLS no banco + storeId em toda query (defesa em profundidade)           |

---

## Parte — product-vision

> **Objetivo**: Criar uma plataforma global, multi-nicho, totalmente orientada por IA,
> capaz de descobrir, avaliar, publicar, vender e operar milhões de produtos automaticamente.

## 1. Visão

A plataforma não é apenas um e-commerce. É uma plataforma inteligente de curadoria,
marketplace operacional e automação. Ela opera 24h/dia:

- Descobre produtos de múltiplos fornecedores
- Analisa tendências e avalia risco
- Calcula margem e define preços dinamicamente
- Gera conteúdo (título, descrição, SEO, FAQ)
- Traduz para 13+ idiomas
- Categoriza e publica automaticamente
- Atualiza preços e estoque em tempo real
- Compara fornecedores (preço, prazo, confiabilidade)
- Recomenda produtos para clientes
- Operação pedidos end-to-end (pagamento → fornecedor → tracking → entrega)
- Detecta fraude
- Responde clientes

## 2. Governança e Conformidade

- Integrações via APIs oficiais ou programas de afiliados/parceiros quando disponíveis
- Respeito aos termos de uso de cada plataforma integrada
- O cliente sabe que está comprando da nossa empresa (responsável pela venda e atendimento)
- Conformidade com legislação de defesa do consumidor de cada país
- Não ocultar a natureza da operação nem induzir o usuário a acreditar que somos o fabricante

## 3. Arquitetura Global

```
Internet → APIs/Parceiros → Provider Connectors → Product Discovery Engine
→ AI Evaluation Engine → AI Approval Pipeline → Global Product Catalog
→ Dynamic Pricing Engine → Search + Recommendation → Customer Frontend
→ Checkout → Order Orchestrator → Supplier Connector → Tracking
→ Customer Notification
```

## 4. Modelo de Dados Evoluído

```
CanonicalProduct (produto canônico — ex: "Mouse Logitech G304")
    ↑
SupplierProduct (oferta de um fornecedor — ex: AliExpress $21)
    ↑
MarketplaceListing (nossa publicação — ex: $34.99 com nossa marca)
```

Múltiplos SupplierProducts apontam para o mesmo CanonicalProduct.
O sistema escolhe automaticamente o melhor fornecedor por pedido.

## 5. Roadmap Reorganizado

### Fase A — Plataforma Global (autônoma)

| Epic | Título                          | Descrição                                                                                               |
| ---- | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A1   | Marketplace Connector Framework | Interfaces para conectores de marketplaces (discovery, catalog, inventory, pricing, order, tracking)    |
| A2   | Product Discovery Engine        | Pipeline: scheduler → discovery jobs → normalize → deduplicate → AI evaluation → approval → catalog     |
| A3   | AI Evaluation Engine            | Score composto (demanda, crescimento, concorrência, margem, avaliações, prazo, etc.) → AI Score 0-100   |
| A4   | Product Approval Workflow       | Estados: DISCOVERED → ANALYZING → APPROVED → PUBLISHED → BOOSTED → DECLINING → REMOVED                  |
| A5   | Global Catalog                  | CanonicalProduct + SupplierProduct + MarketplaceListing (separação completa)                            |
| A6   | Dynamic Pricing                 | Preço calculado continuamente (fornecedor + frete + impostos + moeda + concorrência + demanda + margem) |
| A7   | AI Content Generator            | Título, descrição, bullet points, SEO, slug, meta description, FAQ, especificações                      |
| A8   | Translation Engine              | 13+ idiomas automáticos                                                                                 |
| A9   | Search & Recommendation         | Semantic search, hybrid search, vector search, autocomplete, image search                               |
| A10  | Automation Center               | Cérebro — centenas de decisões automáticas                                                              |
| A11  | Supplier Orchestrator           | Seleção automática do melhor fornecedor por pedido                                                      |

### Fase B — Operação

| Epic | Título                         | Descrição                                                                   |
| ---- | ------------------------------ | --------------------------------------------------------------------------- |
| B1   | Identity (RBAC completo)       | Middleware, guards, <Can> components, admin UI                              |
| B2   | Checkout & Order Orchestration | Carrinho, pagamento, criação de pedidos, disparo para fornecedor            |
| B3   | Customer Experience            | Notificações, recomendações, rastreamento, pós-venda                        |
| B4   | Admin & Analytics              | Dashboard, gestão operacional, métricas, supervisão da automação            |
| B5   | Multi-niche Homepage           | Home dinâmica que muda automaticamente (trending, mais vendidos, promoções) |

## 6. Agentes de IA (especializados, desacoplados)

| Agente               | Responsabilidade          |
| -------------------- | ------------------------- |
| Discovery Agent      | Descobrir novos produtos  |
| Evaluation Agent     | Calcular score composto   |
| Pricing Agent        | Calcular preços dinâmicos |
| Catalog Agent        | Aprovar/reprovar/publicar |
| SEO Agent            | Gerar SEO                 |
| Translation Agent    | Traduzir conteúdo         |
| Recommendation Agent | Recomendar produtos       |
| Fraud Agent          | Detectar fraude           |
| Support Agent        | Responder clientes        |
| Analytics Agent      | Detectar tendências       |

Todos publicam eventos no barramento existente (EventBus + Outbox) e permanecem desacoplados.

## 7. Escala-alvo

- 20+ nichos
- 10 milhões de produtos
- 100 milhões de imagens
- 100 países
- 50 idiomas
- 1000 pedidos/hora
- Milhões de usuários

## 8. Stack Open Source

| Área              | Tecnologia                               |
| ----------------- | ---------------------------------------- |
| Backend           | Node.js, TypeScript, Next.js, Prisma     |
| Banco             | PostgreSQL                               |
| Cache             | Redis                                    |
| Busca             | Meilisearch ou OpenSearch                |
| Filas             | RabbitMQ ou NATS                         |
| Objetos           | MinIO                                    |
| Observabilidade   | OpenTelemetry, Prometheus, Grafana, Loki |
| Workflow          | n8n ou Temporal                          |
| IA (orquestração) | LangGraph, Haystack ou LlamaIndex        |
| Modelos locais    | Ollama, vLLM, LocalAI                    |
| Vetores           | pgvector ou Qdrant                       |
| ETL               | Airbyte                                  |
| Dashboards        | Metabase                                 |
| CI/CD             | GitHub Actions                           |
| Containers        | Docker + Kubernetes                      |
