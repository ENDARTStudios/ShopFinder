# PRD — Product Requirements Document

**Produto:** ShopFinder — Global Dropshipping Platform (hardware de computador)
**Versão:** 1.0 · **Data:** 2026-08-15 · **Owner:** ENDART Studios

## 1. Visão

Uma plataforma de e-commerce de dropshipping de hardware onde **fornecedores são invisíveis ao cliente final** (DECISAO-PRODUTO-001). O ShopFinder agrega ofertas de marketplaces (eBay, AliExpress, Amazon, Newegg, DigiKey, fabricantes), expõe um catálogo único com preço em BRL (cotação ao vivo) e repassa pedidos automaticamente ao fornecedor mais barato após o pagamento via Stripe.

## 2. Personas

| Persona | Descrição | Necessidades |
|---|---|---|
| **Comprador (Guest/Cliente)** | Entusiasta/comprador de hardware | Buscar, comparar, comprar com preço em BRL e checkout Stripe |
| **Admin de loja** | Operador da Store | Gerenciar catálogo, pedidos, pipeline de sincronização |
| **Operador de integrações** | Mantém conectores de fornecedores | Monitorar SyncJobs, credenciais, erros |
| **Superadmin (plataforma)** | ENDART | Gestão cross-store, flags, segurança |

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

| ID | Categoria | Meta |
|---|---|---|
| RNF-1 | Performance | LCP < 2.5s em 4G; skeletons em toda rota assíncrona |
| RNF-2 | Disponibilidade | 99.9%; webhook idempotente e resiliente (Outbox) |
| RNF-3 | Segurança | RLS no Postgres, headers HSTS/CSP, rate limiting, WAF + Bot Fight (ver `SECURITY.md`) |
| RNF-4 | Observabilidade | Error boundary + captura de erros (Sentry-ready), logs estruturados (ver `OBSERVABILITY.md`) |
| RNF-5 | Qualidade | Testes unit/integração/E2E com Codecov (ver `TESTING.md`) |
| RNF-6 | SEO | Core Web Vitals "Good"; sitemap/robots/JSON-LD (ver `SEO-AEO-AIO-GEO.md`) |
| RNF-7 | UX/Motion | Sistema de motion consistente (ver `MOTION-SYSTEM.md`) |

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

| Risco | Mitigação |
|---|---|
| Depreciação de API de fornecedor | Camada de transporte + connector versionado (`packages/infrastructure`) |
| Flutuação cambial | Cotação ao vivo com TTL curto + margem configurável |
| Chargebacks Stripe | Idempotência + PaymentRefund modelado |
| Vazamento de dados cross-store | RLS no banco + storeId em toda query (defesa em profundidade) |
