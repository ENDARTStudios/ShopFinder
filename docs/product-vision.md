# AI Commerce Platform — Product Vision

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
