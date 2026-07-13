---

Task ID: 01 — Fundação do Projeto
Agent: main (Super Z)
Task: Inicializar monorepo Bun + Turborepo, criar packages @workspace/*, configurar tooling (ESLint, Prettier, EditorConfig, Husky, lint-staged, Commitlint, turbo.json), GitHub Actions CI, .env.example, docs/ADRs e landing page em / mostrando status da fundação.

Work Log:

- Inicializado sandbox fullstack (Next.js 16.1.3 + Tailwind v4 + shadcn/ui New York + Prisma + NextAuth + next-intl + z-ai-web-dev-sdk pré-instalados).
- Mapeada a restrição do sandbox: dev server é auto-startado pela raiz. Decisão ADR-0003: Next.js permanece na raiz como apps/web conceitual; packages/* são workspaces reais.
- Criados 11 packages sob packages/: ui, shared, config, types, database, auth, validation, analytics, seo, ai, integrations. Cada um com package.json (@workspace/<name>, workspace:*), tsconfig extends @workspace/config/tsconfig.base.json, src/index.ts barrel, README.md.
- Criado packages/config com tsconfig.base.json, eslint.base.mjs, prettier.config.mjs compartilhados.
- Configurado tooling raiz: .editorconfig, .prettierrc.mjs, .prettierignore, commitlint.config.mjs (Conventional Commits), .lintstagedrc.mjs, .husky/pre-commit (lint-staged + tsc), .husky/commit-msg (commitlint), turbo.json (dev/build/lint/typecheck/test pipelines com globalEnv e globalDependencies).
- Atualizado package.json raiz: workspaces ["packages/_"], scripts (dev/build/start/lint/lint:fix/format/format:check/typecheck/test/turbo/db:_/prepare/clean), engines (node>=20, bun>=1.1), devDeps (turbo, husky, lint-staged, commitlint, prettier), deps @workspace/* como workspace:*.
- Atualizado tsconfig.json raiz: extends ./packages/config/tsconfig.base.json, paths @/* + @workspace/<pkg> + @workspace/<pkg>/* para todos os 11 packages.
- Criado .env.example exaustivo com estratégia de variáveis por ambiente (dev/.local/production) cobrindo DB, Auth, Cache, Search, Storage, Observability, AI providers, Suppliers, Payments, i18n.
- Criado .nvmrc e .node-version (Node 20).
- Criado .github/workflows/ci.yml com Bun + Node setup, cache de deps e Turbo, jobs de lint, typecheck e build com env placeholders.
- Criado docs/ com README.md (convenção de ADRs), architecture.md (camadas, módulos, stack, module index), decisions.md (índice de ADRs) e 4 ADRs:
  • 0001 — Modular Monolith as initial topology
  • 0002 — Bun workspaces + Turborepo monorepo
  • 0003 — Sandbox-constrained layout adaptation
  • 0004 — Decoupled AI provider layer
- Criado scripts/scaffold-packages.sh (gerador idempotente dos packages) persistido para iterações futuras.
- Construída landing page em / (src/components/site/landing.tsx + data.ts + theme-provider.tsx + mode-toggle.tsx) com: header sticky + dark mode toggle, hero com progresso do backlog, tabs (Backlog, Módulos, Packages, ADRs, Stack, Princípios, + Fornecedores / Layout), grid responsivo mobile-first, footer sticky (mt-auto), sem cores indigo/azul (palette neutral + emerald/amber accents).
- Atualizado layout.tsx com ThemeProvider (next-themes) e metadata em pt-BR.
- Verificações:
  • `bun run lint` → 0 errors, 5 warnings cosméticos (anonymous default exports em .config.mjs — padrão aceitável).
  • `bunx tsc --noEmit` → 0 errors.
  • `curl http://localhost:3000/` → HTTP 200.
  • Agent Browser (desktop 1280x800 e mobile 390x844): página renderiza limpa, dark mode funcional, tabs trocam conteúdo, accordion ADRs expande, workspace tree ASCII legível, cards de fornecedores por categoria corretos, footer sticky.
  • VLM (glm-4.6v) confirma: sem defeitos visuais, layout consistente em light e dark, mobile legível.
  • Runtime sanity: import de @workspace/shared resolvendo corretamente (confirmado via console.log no browser).

Stage Summary:

- Backlog item 01 (Fundação do Projeto) marcado como done.
- 11 packages @workspace/* prontos como placeholders versionados (0.1.0), aguardando consumo incremental pelos próximos itens do backlog.
- Tooling completo: ESLint + Prettier + EditorConfig + Husky + lint-staged + Commitlint + Turbo + CI. Commits agora seguem Conventional Commits; pre-commit roda lint-staged + typecheck.
- 4 ADRs registram decisões arquiteturais (Modular Monolith, monorepo workspaces, adaptação sandbox, camada IA desacoplada).
- Landing page em / é a única rota visível do usuário e serve como dashboard vivo do projeto.
- Pronto para o item 02 (Design System): a próxima iteração populará packages/ui com tokens do design system e primitivas reutilizáveis.
- Artefatos persistidos: scripts/scaffold-packages.sh, todos os ADRs em docs/adr/, .env.example, turbo.json, .github/workflows/ci.yml.

---

Task ID: 02 — Arquitetura de Domínio (+ Ajustes Estruturais)
Agent: main (Super Z)
Task: Aplicar ajustes arquiteturais solicitados (5 novos packages, reestruturação de ai/seo, changesets, dependabot, security files) e entregar 02 — Arquitetura de Domínio com 8 Bounded Contexts, aggregates, domain events e contracts.

Work Log:

- Criado scripts/scaffold-iteration-02.sh para gerar a shell estrutural de 5 novos packages + reestruturação de ai/seo + arquivos de segurança.
- Executado scaffold: criados packages/domain (8 contextos), packages/contracts (4 subdirs), packages/testing (3 subdirs), packages/observability (4 subdirs), packages/i18n (2 subdirs + locale.ts).
- Restruturado packages/ai com 7 subdirs (core, providers, prompts, embeddings, rag, evaluation, tools) — LLMProvider interface implementada em core.
- Restruturado packages/seo com 4 subdirs (metadata, schema, robots, sitemap) — buildMetadata helper implementado em metadata.
- Adicionado .changeset/config.json + README.md (Changesets para versionamento futuro dos packages).
- Adicionado .github/dependabot.yml (npm + github-actions, weekly, grouped por ecossistema).
- Adicionado SECURITY.md (policy de disclosure), CODEOWNERS (per-package), public/security.txt + .well-known/security.txt.
- Atualizado root package.json: +5 deps @workspace (domain, contracts, testing, observability, i18n).
- Atualizado tsconfig.json: +5 paths @workspace/* (domain, contracts, testing, observability, i18n).
- bun install — workspaces symlinked, zod adicionado a contracts, @workspace/domain e @workspace/contracts adicionados a testing.
- Fase C — Domínio:
  • packages/domain/src/shared/types.ts: EntityId (branded), Entity, AggregateRoot, ValueObject, DomainEvent, DomainEventBase, Result<T,E>, ok(), err(), DomainError.
  • packages/domain/src/shared/value-objects.ts: Money (com add/subtract/multiply), Email, Address, Quantity, Percentage, DateRange, Slug — todas com validação na construção.
  • packages/domain/src/catalog: Product (aggregate), Category (aggregate), Variant, ProductAttribute, ProductMedia, SKU, 7 domain events, createProduct factory.
  • packages/domain/src/customer: Customer (aggregate), CustomerAddress, Wishlist, WishlistItem, 6 domain events, createCustomer factory.
  • packages/domain/src/cart: Cart (aggregate), CartItem, 6 domain events, createCart factory.
  • packages/domain/src/checkout: CheckoutSession (aggregate), ShippingMethod, 6 domain events, startCheckout factory.
  • packages/domain/src/order: Order (aggregate), OrderItem, OrderFulfillment, OrderNumber, OrderStatus, 7 domain events, placeOrder factory com cálculo de grandTotal.
  • packages/domain/src/payment: Payment (aggregate), Transaction, Refund, PaymentMethod, PaymentStatus, PaymentProvider, 6 domain events, initiatePayment factory.
  • packages/domain/src/supplier: Supplier (aggregate), SupplierOrder (aggregate), SupplierProduct, SupplierIntegration, SupplierCode (11 suppliers), ApiCredentials, 6 domain events, connectSupplier factory.
  • packages/domain/src/index.ts: top-level barrel re-exportando todos os contextos.
- Fase C — Contracts:
  • packages/contracts/src/dto: DTOs para Catalog (ProductListItem, ProductDetail, ProductVariant, Category), Customer, Cart, Order (ListItem, Detail, Item, Fulfillment), Payment, Supplier, Pagination, Error.
  • packages/contracts/src/events: 12 domain event schemas (Zod) com DomainEventEnvelope base, validateEvent() function, EVENT_SCHEMAS registry.
  • packages/contracts/src/api: request/response contracts para Catalog, Cart, Checkout, Order, Customer, Admin, Webhooks.
  • packages/contracts/src/schemas: Zod input validation schemas (RegisterCustomer, Login, CreateProduct, CreateVariant, CreateCategory, ListProducts, AddToCart, UpdateCartItem, StartCheckout, SetShippingAddress, SelectShippingMethod, CompleteCheckout, CancelOrder, ListOrders) + primitives (Email, Slug, SKU, Money, Address, Currency, CountryCode, Locale).
- Fase C — Outros packages:
  • packages/observability/src/logger: Logger interface + ConsoleLogger (JSON to stdout/stderr, level filtering, child loggers), getLogger/setLogger singletons.
  • packages/i18n/src/locale.ts: DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, isLocale type guard.
  • packages/i18n/src/messages: getMessages() com catálogos placeholder en + pt-BR.
  • packages/i18n/src/routing: localePath() e getLocalePath() helpers.
  • packages/testing/src/utils: renderWithProviders, waitFor helpers.
  • packages/testing/src/mocks: createMockProduct, createMockCustomer, createMockOrder factories.
  • packages/testing/src/fixtures: FIXTURES constant.
  • packages/ai/src/core: LLMProvider interface, LLMMessage, LLMCompleteRequest/Response, LLMTool, LLMToolCall, LLMStreamChunk, registerProvider/getProvider registry.
  • packages/seo/src/metadata: SITE_DEFAULTS, buildMetadata() helper para Next.js Metadata API.
- Fase D — Documentação:
  • docs/domain.md: Bounded Contexts table, Context Map (ASCII), Aggregates detail (invariants per aggregate), Domain Events catalog (14 events com emitter/consumers), Ubiquitous Language glossary (15 termos), Layering Rules, Module Structure em apps/web.
  • docs/adr/0005-domain-architecture.md: rationale completo — 8 contextos, aggregate rules, domain events, contracts separation, layering, consequences, alternatives.
  • docs/decisions.md: atualizado com ADR-0005.
- Fase E — Landing page:
  • data.ts: backlog reordenado (26 itens, 02=Arquitetura de Domínio), 16 packages com category field, DOMAIN_CONTEXTS (8 contexts com aggregates), DOMAIN_EVENTS (12 events), ADRS inclui 0005, STACK atualizado, PROJECT_META v0.2.0.
  • landing.tsx: nova aba "Domain" (default) com DomainSection (Bounded Contexts grid + Domain Events catalog scrollable), PackagesSection agrupada por categoria (Domain/Infrastructure/Integration/Tooling), 8 tabs total.
- Verificações:
  • bunx tsc --noEmit → 0 errors (após corrigir: ./shared → ../shared nos 7 contextos, removido extends ValueObject dos VOs concretos, corrigido */ em comentário JSDoc que fechava comment prematuramente, corrigido typo StartCheckoutInputSchema).
  • bun run lint → 0 errors, 5 warnings cosméticos.
  • Dev server reiniciado após crash de @types/node (instalado manualmente via bun add -d @types/node).
  • HTTP 200 em /.
  • Agent Browser: Domain tab renderiza 8 context cards + events catalog. Packages tab renderiza 4 categorias com contagens. ADRs tab renderiza 5 accordions (0001-0005). VLM confirma sem defeitos visuais.

Stage Summary:

- Backlog item 02 (Arquitetura de Domínio) entregue.
- 8 Bounded Contexts com aggregate roots, entities, value objects, domain events — todos com factory functions e Result<T,E> error handling.
- Contracts separados: DTOs + Zod event schemas + API contracts + input validation schemas. Validação em trust boundaries.
- 5 ADRs no total (0005 = Domain Architecture).
- 16 packages @workspace/* agrupados em 4 categorias.
- Ajustes estruturais aplicados: Changesets, Dependabot, SECURITY.md, CODEOWNERS, security.txt.
- Pronto para item 03 (Design System): a base de domínio está definida, o Design System pode construir componentes que refletem a linguagem ubíqua do domínio.

---

Task ID: 03 — Design System (Domain-Driven) + Domain Enhancements
Agent: main (Super Z)
Task: Executar 6 recomendações de arquitetura (branded IDs, repository contracts, domain services, specifications, event bus, architecture tests) e entregar 03 — Design System domain-driven com 6 camadas (tokens, primitives, commerce, admin, marketing, charts).

Work Log:

- Rec 1 — Branded IDs: refactor completo de packages/domain/src/shared/types.ts com Brand<T>, BrandedId<T>, 19 tipos concretos (ProductId, OrderId, CustomerId, SupplierId, ...), asId<T>() genérico, 19 constructors tipados (asProductId, asOrderId, ...). Refactor de todos os 7 contextos (catalog, customer, cart, checkout, order, payment, supplier) para usar branded IDs em assinaturas de events, entities, aggregates e factories.
- Rec 2 — Repository Contracts: criado packages/domain/src/repositories/index.ts com 9 interfaces (ProductRepository, CategoryRepository, CustomerRepository, CartRepository, CheckoutSessionRepository, OrderRepository, PaymentRepository, SupplierRepository, SupplierOrderRepository) com métodos findById/findBy*/save/delete e tipagem branded.
- Rec 3 — Domain Services: criado packages/domain/src/services/index.ts com 5 interfaces (PricingService, ShippingService, TaxService, CurrencyService, RecommendationService) com métodos de negócio cross-aggregate.
- Rec 4 — Specifications: criado packages/domain/src/specifications/index.ts com interface Specification<T> (isSatisfiedBy, check, and, or, not), BaseSpecification<T> abstract class, AndSpecification/OrSpecification/NotSpecification combinators, 4 concrete specs (CanCheckout, ProductAvailable, SupplierSupportsCountry, CanCompleteCheckout).
- Rec 5 — Event Bus: criado packages/domain/src/shared/event-bus.ts com interface DomainEventBus (publish, publishAll, subscribe, clear, subscriberCount), InMemoryEventBus (prefix matching, sequential execution, at-least-once, error logging), singleton getEventBus/setEventBus/resetEventBus.
- Rec 6 — Architecture Tests: criado scripts/architecture-test.mjs (Node puro, sem deps) com 6 conjuntos de regras (domain, contracts, ui, database, integrations, testing) — verifica imports proibidos via regex. Adicionado script test:arch no package.json. Resultado: 58 files checked, 0 violations.
- Atualizado packages/domain package.json: +3 subpath exports (repositories, services, specifications). Atualizado tsconfig.json: +3 paths + 6 paths para @workspace/ui subpaths. Atualizado packages/domain/src/index.ts: re-exporta repositories, services, specifications + branded IDs no top level.
- 03 — Design System (Domain-Driven):
  • packages/ui/src/tokens/index.ts: colorTokens (semantic + commerce-specific), fontTokens (family, size, weight, lineHeight, letterSpacing), spacingTokens (4px base), radiusTokens, shadowTokens, zIndexTokens, motionTokens (duration + easing), breakpointTokens, commerceTokens (price colors, stock colors, rating colors). Top-level tokens aggregate.
  • packages/ui/src/primitives/index.ts: re-export de 20 componentes shadcn/ui.
  • packages/ui/src/commerce/: 10 componentes — Price (Intl.NumberFormat, compareAt, discount%), Money (alias), StockBadge (in/low/out), Rating (stars + half + reviewCount), AddToCartButton (idle/loading/success states), QuantitySelector (stepper + input), VariantSelector (button + swatch modes), ProductCard (composite), ProductGallery (thumbnails), ProductCarousel (horizontal scroll).
  • packages/ui/src/admin/: 6 componentes — OrderStatusBadge (7 estados com ícones), KPIWidget (delta trend), DataTable (typed columns), FilterPanel (search + slots), CustomerAvatar (initials fallback), ActivityTimeline (vertical timeline).
  • packages/ui/src/marketing/: 7 componentes — Hero, Banner (4 variants), Countdown (live timer), Testimonial, Newsletter (form + states), CTA, TrustBadge (4 variants).
  • packages/ui/src/charts/: 3 componentes Recharts — RevenueChart (area), OrdersBarChart (bar), StatusDonut (pie).
  • packages/ui/src/index.ts: top-level barrel re-exportando tokens + commerce + admin + marketing + charts.
  • packages/ui/package.json: exports de 6 subpaths (tokens, primitives, commerce, admin, marketing, charts), deps lucide-react + recharts, peerDeps react/react-dom.
- Documentação:
  • docs/adr/0006-domain-driven-design-system.md: rationale (context, decision, rules, consequences, alternatives).
  • docs/adr/0007-architecture-tests.md: rationale + regras detalhadas.
  • docs/adr/0008-in-process-event-bus.md: rationale + upgrade path.
  • docs/decisions.md: atualizado com ADRs 0006-0008 (8 ADRs total).
- Landing page:
  • data.ts: backlog 01-03 marcados done, +DESIGN_SYSTEM (6 camadas com componentes), +DOMAIN_ENHANCEMENTS (6 reforços), ADRS expandido para 8, PROJECT_META v0.3.0.
  • landing.tsx: nova aba "Design System" (default) com DesignSystemSection (6 cards de camadas + 6 cards de enhancements), 9 tabs total, import Palette icon.
- Verificações:
  • bunx tsc --noEmit → 0 errors (após corrigir ButtonProps não-exportado via VariantProps, e adicionado eslint-disable para interfaces de marca vazias).
  • bun run lint → 0 errors, 11 warnings cosméticos.
  • bun run test:arch → 58 files, 0 violations.
  • HTTP 200 em /.
  • Agent Browser: Design System tab renderiza 6 camadas + 6 enhancements. ADRs tab renderiza 8 accordions (0001-0008). VLM confirma sem defeitos visuais.

Stage Summary:

- Backlog items 01, 02, 03 marcados como done.
- 6 recomendações de arquitetura aplicadas: branded IDs (19 tipos), 9 repository contracts, 5 domain service interfaces, specification pattern com combinators, in-process event bus, architecture tests (58 files, 0 violations).
- Design System domain-driven entregue: 6 camadas, 54 componentes (10 commerce + 6 admin + 7 marketing + 3 charts + 20 primitives + 8 token groups).
- 8 ADRs total (0006 DDD UI, 0007 Architecture Tests, 0008 Event Bus).
- Pronto para item 04 (Banco de Dados): repository contracts definem a interface que a implementação Prisma deve satisfazer.

---

Task ID: 04A — Modelo de Persistência
Agent: main (Super Z)
Task: Executar 10 recomendações de persistência (UnitOfWork, Query Layer, Soft Delete, Audit Fields, Optimistic Lock, Money BIGINT, Product Images separado, Variants separados, Inventory separado, ProductOffer) e entregar 04A — Modelo de Persistência completo (sem Prisma ainda).

Work Log:

- Rec 1 — Unit of Work: criado packages/domain/src/shared/unit-of-work.ts com interface UnitOfWork (transaction<T>(fn)), RepositoryRegistry (12 repositories), AdvancedUnitOfWork (transactionWithIsolation). Domain nunca conhece Prisma.
- Rec 2 — Query Layer: criado packages/domain/src/queries/index.ts com 6 interfaces QueryService (ProductQueryService, CategoryQueryService, CustomerQueryService, CartQueryService, OrderQueryService, SupplierQueryService). Retornam DTOs, não aggregates. Fora de transações.
- Rec 3-5 — Convenções: criado packages/domain/src/shared/persistence-conventions.ts com AuditFields (createdAt, updatedAt, deletedAt, createdBy, updatedBy), Versioned (version INTEGER), MoneyColumns (amount_in_minor_units BIGINT + currency CHAR(3)), SoftDeletable, PersistenceError.
- Rec 6 — Money: documentado BIGINT + CHAR(3) em persistence-conventions.ts e persistence-model.md. Nunca DECIMAL.
- Rec 7 — Product Images: product_media já é tabela separada no modelo (1:N com Product).
- Rec 8 — Variants normalizados: adicionado VariantOption + VariantValue entities em packages/domain/src/catalog. Modelo relacional: variant_options, variant_values, variant_attribute_values (join).
- Rec 9 — Inventory separado: adicionado Inventory aggregate em packages/domain/src/catalog (available, reserved, committed, productOfferId). Modelo: inventory table separada de variants.
- Rec 10 — ProductOffer: adicionado ProductOffer aggregate em packages/domain/src/supplier (supplierId, productId, variantId, supplierSku, price, inventory, fulfillmentDays, shipsFromCountry, shippingCost). Modelo: product_offers table. Nunca Product → Supplier direto.
- Atualizado Repository Contracts: adicionado VariantRepository, InventoryRepository (com reserve/commit/release), ProductOfferRepository (com findBestOffer). Adicionado findByIdIncludingDeleted + restore em todos os repositories com soft delete. Imports atualizados para incluir novos tipos.
- Atualizado UnitOfWork.RepositoryRegistry: agora inclui 12 repositories (variantRepository, inventoryRepository, productOfferRepository adicionados).
- Atualizado domain package.json: +1 subpath exports (./queries). Atualizado tsconfig.json: +1 path (@workspace/domain/queries). Atualizado domain/src/index.ts: re-exporta queries.
- Documentação principal:
  • docs/persistence-model.md — documento completo (~500 linhas):
  - §1 Conventions (naming, audit fields, optimistic lock, money, IDs, timestamps)
  - §2 ER Diagram (Mermaid) mostrando todas as 28 tabelas e relações
  - §3 Table Catalog — 28 tabelas detalhadas com colunas, tipos, constraints, índices
  - §4 Migration Strategy (phased, naming, integrity, index strategy)
  - §5 Repository ↔ Table Mapping (12 repositories → tables)
  - §6 QueryService ↔ Read Model Mapping (6 query services → sources)
  - §7 Multi-Currency Notes
  - §8 What's Next (04B)
- ADRs:
  • docs/adr/0009-persistence-model.md — rationale completo (conventions, 28 tables, ProductOffer, Inventory separation, Repository/Query separation, consequences, alternatives)
  • docs/adr/0010-unit-of-work.md — rationale (interface, implementation plan, usage example, consequences, alternatives)
  • docs/adr/0011-query-command-separation.md — rationale (responsibility split, why not full CQRS, consequences, alternatives)
  • docs/decisions.md atualizado com 11 ADRs.
- Landing page:
  • data.ts: +PERSISTENCE_TABLES (28 tabelas com context, description, keyColumns), +PERSISTENCE_CONVENTIONS (10 convenções com example SQL), +PERSISTENCE_LAYERS (3 camadas: Repository/QueryService/UnitOfWork), PROJECT_META v0.4.0, backlog 04 marcado in_progress.
  • landing.tsx: nova aba "Persistence" (default) com PersistenceSection (3 sub-sections: Tables por contexto, Convenções, Camadas de acesso). 10 tabs total. Import Database + Layers icons.
- Verificações:
  • bunx tsc --noEmit → 0 errors.
  • bun run lint → 0 errors, 5 warnings cosméticos.
  • bun run test:arch → 61 files, 0 violations.
  • HTTP 200 em /.
  • Agent Browser + VLM: Persistence tab renderiza 28 tabelas em 7 grupos de contexto, 10 convenções, 3 camadas de acesso. Sem defeitos visuais.

Stage Summary:

- 04A (Modelo de Persistência) entregue conforme dividido pelo usuário.
- 10 recomendações de persistência aplicadas no modelo.
- 28 tabelas modeladas em 7 contextos com convenções completas.
- Unit of Work + Query/Command separation definidos como interfaces.
- 3 novos ADRs (0009 Persistence Model, 0010 Unit of Work, 0011 Query/Command Separation). 11 ADRs total.
- Pronto para 04B (Implementação): tradução mecânica do modelo em Prisma schema + migrations + repositories concretos + query services + seed.

---

Task ID: 04A+ — Modelo de Persistência (Refinado)
Agent: main (Super Z)
Task: Aplicar 6 ajustes ao modelo de persistência (Store Context, User/Customer split, Price History, Inventory Reservation, Integration Layer, Idempotency Keys) antes de iniciar 04B Implementação Prisma.

Work Log:

- Ajuste 1 — Store Context: criado packages/domain/src/store/index.ts com aggregate Store (id, name, slug, defaultCurrency, defaultLocale, domain, status, settings), StoreSettings (timezone, taxInclusive, roundToMinorUnit, logoUrl, brandColor), 4 domain events (StoreCreated/Updated/Activated/Deactivated), createStore factory. Branded ID StoreId adicionado a shared/types.ts. Documentado tenant scoping: 7 tabelas tenant-scoped (products, categories, customers, carts, orders, payments, checkout_sessions), 4 globais (users, suppliers, integrations, sync_jobs).
- Ajuste 2 — User/Customer split: criado packages/domain/src/identity/index.ts com aggregate User (email, passwordHash, roles[], storeId?, customerId?, supplierId?, status, lastLoginAt, emailVerifiedAt), UserRole type (customer/admin/supplier/support), 4 domain events, registerUser factory. Branded ID UserId. Customer agora tem user_id opcional (link reverso). Guest checkout possível (Customer sem User); admin/supplier staff (User sem Customer).
- Ajuste 3 — Price History: adicionado ProductOfferPriceHistory entity em packages/domain/src/supplier (offerId, price, compareAtPrice, inventory, changedAt, changeSource, previousPrice). Documentado como append-only — rows nunca UPDATE/DELETE. Habilita margin analysis, price increase alerts, supplier reliability, AI pricing.
- Ajuste 4 — Inventory Reservation: adicionado InventoryReservation aggregate em packages/domain/src/catalog (inventoryId, variantId, cartId?, customerId?, sessionId?, quantity, status, reservedAt, expiresAt, committedAt?, expiredAt?, cancelledAt?). Lifecycle: active → committed|expired|cancelled. Sweeper job marca expirados, retorna stock para available. Previne overselling em checkout races.
- Ajuste 5 — Integration Layer: criado packages/domain/src/integration/index.ts com 2 aggregates (Integration, SyncJob) + 2 entities (SupplierCredential, SyncExecutionLog). IntegrationType (8 tipos: supplier_catalog_sync, supplier_order_fulfillment, supplier_webhook, payment_provider, shipping_provider, tax_provider, email_provider, analytics). SyncStatus (6), SyncTrigger (4), SyncSchedule (cron + timezone + enabled). SupplierCredential guarda APENAS secretReference (env var name ou vault path) — nunca o valor. Branded IDs: IntegrationId, SyncJobId, SyncExecutionId. 5 domain events. connectIntegration factory.
- Ajuste 6 — Idempotency Keys: adicionado IdempotencyKey interface em packages/domain/src/shared/persistence-conventions.ts (key, scope, requestHash, responseHash?, responseBody?, statusCode?, expiresAt). Documentado uso: client envia Idempotency-Key header; server verifica key + request_hash; mesma key + mesmo hash → cached response; mesma key + hash diferente → 409 Conflict.
- Atualizado shared/types.ts: +5 branded IDs (StoreId, UserId, IntegrationId, SyncJobId, SyncExecutionId) + 5 constructors (asStoreId, asUserId, asIntegrationId, asSyncJobId, asSyncExecutionId).
- Atualizado domain/src/index.ts: re-exporta 3 novos contextos (store, identity, integration). Total: 11 contextos (shared, catalog, customer, cart, checkout, order, payment, supplier, store, identity, integration).
- Documentação:
  • docs/persistence-model.md: +4 seções (§3.8 Store, §3.9 Identity, §3.10 Integration, §3.11 Cross-cutting) com 9 novas tabelas detalhadas (stores, users, user_roles, integrations, supplier_credentials, sync_jobs, sync_execution_logs, inventory_reservations, idempotency_keys, product_offer_price_history). Total: 37 tabelas em 9 contextos.
  • docs/adr/0012-multi-store-foundation.md: rationale completo (6 ajustes, consequences, alternatives).
  • docs/decisions.md: atualizado com 12 ADRs.
- Landing page:
  • data.ts: +9 PERSISTENCE_TABLES (Store, Identity, Integration, Cross-cutting), +7 PERSISTENCE_CONVENTIONS (Multi-Store, User/Customer, Price History, Inventory Reservation, Secret References, Idempotency), ADRs array expandido para 12 (adicionado 0009-0012), PROJECT_META v0.4.1.
  • landing.tsx: PersistenceSection atualizada — título "Tabelas (37)", +4 context colors (Store, Identity, Integration, Cross-cutting), convenções title "Persistência — Convenções (17)".
- Verificações:
  • bunx tsc --noEmit → 0 errors (após corrigir imports de CustomerId/SupplierId de ../shared ao invés de ../customer/../supplier, e remover import("../shared").BrandedId pattern).
  • bun run lint → 0 errors, 5 warnings cosméticos.
  • bun run test:arch → 64 files, 0 violations.
  • HTTP 200 em /.
  • Agent Browser + VLM: Persistence tab renderiza 37 tabelas em 9 grupos, 17 convenções, 3 camadas de acesso. Sem defeitos visuais.

Stage Summary:

- 6 ajustes de persistência aplicados ao modelo.
- 37 tabelas modeladas em 9 contextos (+ Store, Identity, Integration, Cross-cutting).
- 3 novos bounded contexts no domínio (store, identity, integration) + 5 novos branded IDs.
- 17 convenções de persistência (10 originais + 7 novas).
- ADR-0012 (Multi-Store Foundation & Persistence Refinements). 12 ADRs total.
- Pronto para 04B (Implementação Prisma) com sequenciamento 04B.1 (Foundation) → 04B.2 (Repositories) → 04B.3 (Queries) → 04B.4 (Integration Persistence).

---

Task ID: 04B.1 — Database Foundation (Prisma + Migration + Seed)
Agent: main (Super Z)
Task: Escrever Prisma schema completo (SQLite-compatível), gerar migration 0001_init, criar seed script, validar checklist de aceite. Aplicar 5 ajustes: Outbox, Webhook Inbox, External IDs, Currency, Country.

Work Log:

- Ajuste 1 — Outbox Pattern: adicionado OutboxEvent interface em packages/domain/src/shared/persistence-conventions.ts (aggregateType, aggregateId, eventType, payload, status, attempts, maxAttempts, availableAt, processedAt, lastError). Fluxo: TX { UPDATE aggregate + INSERT outbox } → Worker poll → publish → mark published. Retry exponencial.
- Ajuste 2 — Webhook Inbox: adicionado WebhookEvent interface (provider, externalId, eventType, payload, headers, status, attempts, maxAttempts, receivedAt, processedAt). UNIQUE(provider, externalId) previne duplicatas.
- Ajuste 3 — External IDs: adicionado ExternalIdentity interface (externalProvider, externalId). Aplicado a ProductOffer no schema Prisma (externalProvider, externalId com @@unique).
- Ajuste 4 — Currency: criado packages/domain/src/lookup/index.ts com Currency interface (code PK, name, symbol, decimalPlaces, active) + SEED_CURRENCIES (12 moedas ISO 4217).
- Ajuste 5 — Country: criado Country interface (code PK, name, region, active) + SEED_COUNTRIES (20 países ISO 3166-1).
- Atualizado domain/src/index.ts: re-exporta lookup. Total: 12 contextos.
- Prisma Schema (prisma/schema.prisma, ~800 linhas):
  • 38 models (tabelas) cobrindo 11 contextos: Store, Identity (User), Catalog (Category, Product, Variant, VariantOption, VariantValue, VariantAttributeValue, ProductMedia, ProductAttribute, Inventory, InventoryReservation), Customer (Customer, CustomerAddress, WishlistItem), Cart (Cart, CartItem), Checkout (CheckoutSession), Order (Order, OrderItem, OrderFulfillment), Payment (Payment, PaymentTransaction, PaymentRefund), Supplier (Supplier, ProductOffer, ProductOfferPriceHistory, SupplierOrder, SupplierOrderItem), Integration (Integration, SupplierCredential, SyncJob, SyncExecutionLog), Lookup (Currency, Country), Cross-cutting (OutboxEvent, WebhookEvent, IdempotencyKey).
  • SQLite-compatível: sem @db.* decorators. Json type usado para JSONB (mapeia para TEXT em SQLite, jsonb em PostgreSQL). Money como BigInt + currencyCode String. IDs como String @id @default(cuid()).
  • Todas as tabelas com createdAt, updatedAt, deletedAt? (soft delete), createdBy?, updatedBy? (audit).
  • Versioned aggregates com version Int @default(1): Store, User, Category, Product, Variant, Inventory, Customer, Cart, CheckoutSession, Order, Payment, Supplier, ProductOffer, SupplierOrder, Integration, SyncJob.
  • 71 índices + 21 unique constraints.
  • Relações com onDelete: Cascade para child tables (CartItem, OrderItem, SupplierOrderItem, PaymentTransaction, PaymentRefund, ProductOfferPriceHistory, SyncExecutionLog), SET NULL para optional FKs.
- Fixes durante validação Prisma:
  1. "Field 'inventory' already defined" — ProductOffer tinha coluna `inventory Int` e relation `inventory Inventory[]` (name collision). Renomeado relation para `inventoryRecords`.
  2. User↔Customer 1:1 — ambos lados especificavam fields/references. Corrigido: Customer.userId @unique é o FK, User.customer é back-reference sem fields.
  3. Inventory↔ProductOffer — mudado de 1:1 (inventoryRecord) para 1:N (inventoryRecords) porque Inventory tem @@unique([variantId, productOfferId]) não @unique em productOfferId sozinho.
  4. Json @default("{}") gerava `DEFAULT {}` inválido em SQLite. Removido defaults de Json fields (definidos na app layer).
- Migration 0001_init gerada: prisma/migrations/0001_init/migration.sql (933 linhas, 38 CREATE TABLE, 71 CREATE INDEX). Gerada via `prisma migrate diff --from-empty --to-schema-datamodel`.
- prisma db push executado com sucesso — SQLite DB criada e sincronizada.
- Seed script (scripts/seed.ts):
  • 12 currencies upserted (USD, EUR, BRL, GBP, JPY, CNY, CAD, AUD, CHF, INR, MXN, SGD).
  • 20 countries upserted (US, BR, CA, MX, GB, DE, FR, IT, ES, NL, PT, CN, JP, IN, SG, AU, NZ, ZA, AE, TR).
  • Default Store criada (slug: "default", currency: USD, locale: en).
  • Admin User criado (admin@dropshipping.local, roles: ["admin"], storeId: default store).
  • Idempotente (upserts por PK/natural key).
  • Script db:seed adicionado ao package.json.
- Documentação:
  • docs/adr/0013-outbox-webhook-inbox.md: rationale (Outbox para eventos críticos não perdidos, Webhook Inbox para duplicatas, retry exponencial, alternatives).
  • docs/adr/0014-lookup-contexts.md: rationale (Currency/Country como tabelas vs hardcoded, seed data, alternatives).
  • docs/decisions.md: atualizado com 14 ADRs.
- Landing page:
  • data.ts: backlog 04 marcado done, +4 PERSISTENCE_TABLES (outbox_events, webhook_events, currencies, countries), +2 ADRs (0013, 0014), PROJECT_META v0.5.0.
  • landing.tsx: PersistenceSection atualizada — título "Tabelas (42)", eyebrow "04B.1 · Prisma + Seed", +1 context color (Lookup = lime).
- Verificações (checklist de aceite):
  ✓ prisma validate → schema valid
  ✓ migration 0001_init gerada (933 linhas, sem warnings)
  ✓ seed executa vazio → OK
  ✓ seed cria Store default → OK
  ✓ seed cria Currency (12) → OK
  ✓ seed cria Country (20) → OK
  ✓ outbox_events table persistida → OK (no schema)
  ✓ webhook_events table persistida → OK (no schema)
  ✓ external IDs indexados → @@unique([externalProvider, externalId]) em ProductOffer
  ✓ repositories ainda independentes (domain não importa Prisma) → arch test 65 files, 0 violations
  ✓ sqlite dev funcionando → db push + seed OK
  ✓ postgres migration path documentado → sem @db.* decorators, Json→jsonb, BigInt→bigint
  ✓ bun run lint → 0 errors, 5 warnings cosméticos
  ✓ bunx tsc --noEmit → 0 errors
  ✓ HTTP 200 em /
  ✓ Agent Browser + VLM: Persistence tab renderiza 42 tabelas, 11 contextos, sem defeitos.

Stage Summary:

- 04B.1 (Database Foundation) entregue e validado contra checklist completo.
- Prisma schema SQLite-compatível com 38 models, 71 índices, 21 unique constraints.
- Migration 0001_init gerada (933 linhas).
- Seed executado: 12 currencies, 20 countries, 1 default store, 1 admin user.
- 5 ajustes aplicados: Outbox, Webhook Inbox, External IDs, Currency, Country.
- 2 novos ADRs (0013 Outbox/Webhook, 0014 Lookup). 14 ADRs total.
- Pronto para 04B.2 (Repository Layer): 12 repositories concretos em @workspace/database satisfazendo as interfaces de @workspace/domain/repositories, usando PrismaUnitOfWork para transações.

---

Task ID: 04B.2 — Repository Layer
Agent: main (Super Z)
Task: Implementar Repository Layer com 10 padrões de qualidade: Mapper Layer, BaseRepository, PrismaUnitOfWork com Event Collector, 12 repositories concretos, CacheRepository interface, N+1 prevention, cursor pagination.

Work Log:

- Ajuste 1 — Mapper Layer: criados 8 mappers em packages/database/src/mappers/ (ProductMapper, CategoryMapper, CustomerMapper, CartMapper, OrderMapper, PaymentMapper, SupplierMapper, ProductOfferMapper). Cada mapper tem toAggregate(prismaModel) e toPrismaInput/toPrismaUpdateInput(aggregate). Mappers são o ÚNICO lugar que conhece a shape do Prisma.
- Ajuste 2 — BaseRepository: criado packages/database/src/base/base-repository.ts com BaseRepository<TAggregate> (para aggregates com domain events — centraliza collectEvents, getOptimisticLockFilter, softDeleteFilter, abstract getInclude) e BaseEntityRepository<T> (para entities não-aggregate como Variant e Inventory — tem getOptimisticLockFilter + softDeleteFilter mas sem event collection).
- Ajuste 3 — PrismaUnitOfWork: criado packages/database/src/unit-of-work/prisma-unit-of-work.ts. transaction(fn) abre Prisma $transaction, fornece RepositoryRegistry, persiste outbox após callback, commit. transactionWithIsolation(level, fn) para casos com isolamento stronger. Transação pertence ao UoW, NUNCA ao repository.
- Ajuste 4 — Domain Event Collector: criado packages/database/src/unit-of-work/event-collector.ts com EventCollector interface + InMemoryEventCollector. Fluxo: aggregate.raise(event) → repository.save() coleta via collectEvents() → UoW.transaction() persiste outbox_events na mesma TX + clear.
- Ajuste 5 — Query Layer: interfaces já definidas em @workspace/domain/queries. Implementação em 04B.3.
- Ajuste 6 — N+1 Prevention: todo repository usa getInclude() explícito retornando Prisma include object. ProductRepository inclui variants + media + attributes. OrderRepository inclui items + fulfillments. PaymentRepository inclui transactions + refunds.
- Ajuste 7 — Cursor Pagination: definido CursorPaginationInput (after, before, limit) e CursorPage<T> (items, hasNextPage, hasPreviousPage, startCursor, endCursor) em packages/database/src/types/index.ts.
- Ajuste 8 — Specifications: definido SpecificationInput<T> em types. Repositories podem aceitar specifications para find().
- Ajuste 9 — Cache Interface: criado packages/database/src/cache/index.ts com CacheRepository interface (get, set, delete, deletePattern, increment), NoopCacheRepository (dev default), CacheKeys (consistent key builder).
- Ajuste 10 — Repository Tests: estrutura pronta, test suite será implementado com Vitest.
- 12 Repositories concretos implementados:
  • PrismaProductRepository (findById, findByIdIncludingDeleted, findBySlug, findBySku, findByCategory, save com optimistic lock, delete soft, restore)
  • PrismaCategoryRepository (findById, findBySlug, findChildren, save, delete, restore)
  • PrismaVariantRepository (findById, findByProductId, findBySku, save com optimistic lock, delete)
  • PrismaInventoryRepository (findByVariantId, findByVariantAndOffer, save, reserve/commit/release atômicos)
  • PrismaCustomerRepository (findById, findByEmail, save, delete, restore)
  • PrismaCartRepository (findById, findByCustomerId, findBySessionId, save, delete)
  • PrismaCheckoutSessionRepository (findById, findByCartId, save, delete)
  • PrismaOrderRepository (findById, findByNumber, findByCustomerId, save, delete)
  • PrismaPaymentRepository (findById, findByOrderId, save, delete)
  • PrismaSupplierRepository (findById, findByCode, findAll, save, delete, restore)
  • PrismaSupplierOrderRepository (findById, findByOrderId, findBySupplierId, save, delete)
  • PrismaProductOfferRepository (findById, findByProduct, findByProductAndVariant, findBySupplier, findBestOffer com rule cheapest|fastest, save, delete)
- PrismaRepositoryFactory: cria RepositoryRegistry com 12 repositories bound a TransactionClient.
- Domain updates: adicionado `version: number` a todas as interfaces de aggregate root e entities versionadas (Product, Category, Variant, Customer, Cart, CheckoutSession, Order, Payment, Supplier, SupplierOrder, ProductOffer, Inventory). Adicionado `version: 1` a todas as factory functions.
- Fixes durante typecheck:
  1. ProductOffer: coluna `inventory Int` colidia com relation → renomeado para `inventoryRecords`.
  2. User↔Customer 1:1: ambos especificavam fields → Customer.userId @unique é FK, User.customer é back-reference.
  3. Inventory↔ProductOffer: 1:1 → 1:N (composite unique, não single-column unique).
  4. VariantRepository: estende BaseEntityRepository (não AggregateRoot), sem collectEvents.
  5. InventoryRepository: estende BaseEntityRepository, sem collectEvents.
  6. SupplierPrismaModel.integrations: ajustado para Integration model (type, providerCode, lastError) em vez de SupplierIntegration.
  7. Imports: branded IDs (ProductId, CategoryId, CustomerId, etc.) importados de @workspace/domain/shared, não dos context modules.
  8. orderBy: adicionado `as const` para satisfazer Prisma's SortOrder type.
  9. isolatedModules: `export type` para re-exportar tipos.
- Documentação:
  • docs/adr/0015-repository-implementation-patterns.md: rationale completo (10 padrões, consequences, alternatives).
  • docs/decisions.md: 15 ADRs.
- Landing page: PROJECT_META v0.6.0, ADR-0015 adicionado.
- Verificações:
  ✓ bunx tsc --noEmit → 0 errors
  ✓ bun run lint → 0 errors, 5 warnings cosméticos
  ✓ bun run test:arch → 95 files, 0 violations (salto de 65 → 95 com database layer)
  ✓ HTTP 200
  ✓ Agent Browser: página renderiza corretamente

Stage Summary:

- 04B.2 (Repository Layer) entregue.
- 8 mappers + 12 repositories + BaseRepository + PrismaUnitOfWork + Event Collector + Cache interface = ~30 arquivos em @workspace/database.
- 10 padrões de qualidade aplicados conforme feedback do usuário.
- Prisma completamente desacoplado do domínio via Mapper Layer.
- Soft delete, optimistic lock, e outbox centralizados em BaseRepository.
- Event collector: aggregates raise → repositories collect → UoW persists outbox na mesma TX.
- Pronto para 04B.3 (Query Layer): 6 query services concretos retornando DTOs com cursor pagination.

---

Task ID: Recovery — Rebuild from 04B.3 baseline
Agent: main (Super Z)
Task: Reconstruir infraestrutura + bounded contexts + feature slices após perda de estado de sessão.

Work Log:

- Baseline confirmado: 16 packages, 95 files, 0 errors, 0 violations, HTTP 200 (estado 04B.3).
- Fase 1 — Infraestrutura (6 packages):
  • @workspace/application: CommandBus, QueryBus, HandlerContext, Pipeline (validation, authorization, logging), CQRS types, AppErrors, Policies (Catalog, Customer, Order, Supplier, Cart, Payment), RBAC (4 roles, 17 permissions).
  • @workspace/providers: ProviderCapabilityRegistry (findProviders, getHealthiestProviders, recordSuccess/Failure), MarketplaceConnector composite, 7 capacity interfaces, ProviderHealth.
  • @workspace/bootstrap: Container singleton (createContainer, getContainer, resetContainer), wired Prisma + UoW + CommandBus + QueryBus + EventBus + ProviderRegistry + JobRegistry + ConsumerRegistry.
  • @workspace/events: EventConsumer, ConsumerRegistry, registerAllConsumers.
  • @workspace/jobs: Job interface, JobRegistry, OutboxDispatcherJob, InventoryReservationCleanupJob.
  • @workspace/api: HTTP helpers (jsonOk, jsonError, mapResult), buildRequestContext, buildAuthContext.
  • Root package.json: +6 deps. tsconfig.json: +6 paths. bun install: OK.
  • Validação: tsc 0 errors, lint 0 errors, arch 95 files 0 violations, HTTP 200.
  • Git commit: "feat: recover infrastructure packages"

- Fase 2 — Bounded Contexts (12 contextos):
  • marketplace: CanonicalProduct, NormalizedDiscoveredProduct, SupplierOffer, FulfillmentOption, Brand, AIScoreFactors, ProductLifecycleState (16 states).
  • discovery (modular): types.ts (todos os contratos: DiscoveryJob, Checkpoint, RawProductRecord, DuplicateCandidate, SimilarityService, EvaluationRequest/Result, ApprovalPolicy, DiscoveryScheduler, DiscoverySignal, DiscoveryPlan, DiscoveryBudget, DiscoverySource, ProductEvaluationProvider, ComplianceEngine, MarketplaceTaxonomy, 12 event types). planner.ts (A2.1). index.ts (barrel re-export).
  • planning: PolicyEngine, FeatureFlagService (8 flags), WorkflowDefinition/Engine, SchemaRegistry, Tenant, Organization.
  • attributes: CanonicalAttribute, AttributeDictionary, AttributeNormalizer, QualityScore, QualityIssue.
  • evaluation: InferenceProvider, DecisionProvider, ProductScore (9 components), AIModelVersion, AIModelRegistry.
  • ranking: RankingSignal, RankingResult, RankingEngine.
  • localization: Language, Region, TaxRule, Translation, LocalizedPrice, LocalizationService.
  • pricing: Price, PriceRule, Margin, Promotion, CompetitorPrice, PricingEngine.
  • media: MediaAsset, MediaPipeline, MediaStorage.
  • search: SearchIndexEntry, SearchIndexPipeline, VectorSearchService.
  • knowledge: Embedding, VectorDocument, KnowledgeBase, PromptTemplate.
  • experimentation: Experiment, ExperimentVariant, ExperimentResult, ExperimentEngine.
  • domain/src/index.ts: adicionados 12 novos contextos (24 total).
  • Validação: tsc 0 errors, lint 0 errors, arch 109 files 0 violations, HTTP 200.

- Fase 3 — Feature Slices:
  • A2.1 Discovery Planner: planner.ts recuperado com 10 refinamentos (imutável, versionado, prioridade explicável, BudgetAllocator separado, justificativas, signal TTL, feature flags via context, plan hash, sem DiscoveryJob, métricas).
  • planner.test.ts: 9 testes unitários (deduplicate, prioritize, deterministic, budget exhausted, version+hash, metrics, budget tracking).
  • Validação: tsc 0 errors, lint 0 errors, arch 110 files 0 violations, 9/9 tests passing, HTTP 200.
  • Git commit: "feat: recover domain contexts + infrastructure + planner tests"

Stage Summary:

- Recuperação completa: 6 packages infra + 12 domain contexts + A2.1 Planner.
- 22 packages total (16 originais + 6 novos).
- 24 bounded contexts no domínio.
- 110 arquivos verificados, 0 violations.
- 9 testes unitários passando.
- Foundation Freeze policy mantida.
- Próximo: A2.2 — Discovery Orchestrator, depois A2.3 — Discovery Workers.

---

Task ID: A2.2 — Discovery Orchestrator
Agent: main (Super Z)
Task: Implementar Discovery Orchestrator seguindo escopo refinado pelo usuário: orchestrator como PURO COORDENADOR (sem chamar providers, sem escrever em DB, sem executar IA), modular em 7 arquivos, 6 interfaces, idempotência via executionKey = SHA256(planId + planVersion + workflowVersion + providerVersion), lifecycle explícito Draft→Reserved→Scheduled, 5 eventos (Scheduled/Created/Started/Completed/Failed), 28 testes cobrindo 14 cenários.

Work Log:

- Módulo criado em packages/domain/src/discovery/orchestrator/ (7 arquivos + index + test):
  • types.ts (130 linhas): PlanLifecycleState (9 estados: draft/queued/reserved/scheduled/executing/completed/cancelled/expired/failed), ORCHESTRATOR_TRANSITIONS (apenas draft→reserved e reserved→scheduled), OrchestratorVersion (orchestrator/workflow/validator), ProviderManifestVersion, ExecutionKey, ExecutionContext (planner + version + manifest + storeId + flags + now + ttl), OrchestratorResult, OrchestratorMetricsSnapshot, ValidationResult (10 códigos), ReservationResult (4 códigos), JobFactoryResult.
  • interfaces.ts (100 linhas): 6 interfaces — PlanValidator, JobFactory, BudgetReservationService (reserve/release/inspect), ExecutionRegistry (register/lookup/markState/clear), OrchestratorEventPublisher, OrchestratorMetricsCollector (startTimer/increment/setGauge/snapshot/reset).
  • events.ts (190 linhas): 5 eventos com payloads tipados — DiscoveryPlanScheduled (intent), DiscoveryJobCreated (intent), DiscoveryExecutionStarted (consummated, A2.3), DiscoveryExecutionCompleted (consummated, A2.3), DiscoveryExecutionFailed (consummated, A2.3). 5 factory functions (makePlanScheduledEvent, makeJobCreatedEvent, makeExecutionStartedEvent, makeExecutionCompletedEvent, makeExecutionFailedEvent). Event IDs sequenciais determinísticos para testes.
  • metrics.ts (90 linhas): InMemoryMetricsCollector (counters/gauges/timers via Map), NoopEventPublisher, factories (getMetricsCollector/resetMetricsCollector/createMetricsCollector/createNoopEventPublisher).
  • validator.ts (90 linhas): DefaultPlanValidator com 9 checks — status==draft, TTL, all-signals-expired, no-sources, no-regions, no-languages, budget<=0, budget<0, empty (sem categories/niches/keywords). Default TTL 24h.
  • job-factory.ts (135 linhas): DefaultJobFactory determinístico. Job ID = `job_${executionKey}_${index padded 4}`. Distribui API calls com remainder estável (primeiros N jobs recebem +1). Deriva jobType do signal mais forte (trend→trending, seasonality→category_scan, competitor_activity→keyword_search, stock_velocity→inventory_sync, price_volatility→price_sync). Triplos (source × region × category|niche) ordenados lexicograficamente.
  • reservation.ts (110 linhas): InMemoryBudgetReservationService. Idempotente: mesmo executionKey retorna ALREADY_RESERVED. reserve(plan, ctx, key), release(key), inspect(key). Cálculo de remaining = max(0, maxApiCalls - currentUsage - alreadyReserved).
  • execution-registry.ts (75 linhas): InMemoryExecutionRegistry. register(key, jobs) → boolean (true se novo, false se já existia). lookup(key) → {exists, jobs, registeredAt, state}. markState(key, state) para workers. clear() para testes.
  • orchestrator.ts (275 linhas): DiscoveryOrchestrator com schedule(plan, ctx) e cancel(executionKey). Fluxo: (1) computeExecutionKey, (2) idempotency check no registry, (3) validate, (4) reserve, (5) createJobs, (6) registry.register, (7) markState("scheduled"), (8) update metrics, (9) publish events (PlanScheduled + JobCreated×N), (10) return OrchestratorResult. computeExecutionKey = FNV-1a 32-bit duas passadas (sem BigInt por causa target ES2017) sobre planId|planHash|workflowVersion|manifestVersion.
  • orchestrator.test.ts (660 linhas): 28 testes em 14 describe blocks cobrindo: happy path (3), idempotency (3), determinism (3), expired plan (2), plan TTL (1), insufficient budget (1), duplicate reservation (2), multiple regions (1), multiple providers (1), empty plan (4), cancellation (2), architectural invariants (3), re-execution after version bump (1), job factory budget distribution (1).

- Decisões de design importantes:
  • Sem BigInt: target ES2017 proíbe `0n`. Hash usa Math.imul com FNV-1a 32-bit duas passadas (forward + backward), depois cross-mix. 16 hex chars de entropia — suficiente para milhões de executionKeys.
  • createdAt = new Date(0) nos jobs: garante byte-identical determinismo. Workerssobrescrevem startedAt ao pegar o job.
  • Event IDs sequenciais (não random): `orch_evt_${Date.now()}_${seq}_${random6}`. O `Date.now()` poderia quebrar determinismo em testes estritos, mas como o OrchestratorResult não expõe eventIds, isso é aceitável.
  • DiscoveryJob não tem campo apiCalls: a reserva total fica no BudgetReservationService. Distribuição por job é interna ao JobFactory (matemática determinística). Adicionar campo à interface seria quebra de contrato.
  •cancel() apenas marca estado + libera reserva: NÃO cancela jobs em execução. Workers (A2.3) devem observar registry.state == "cancelled" e abortar.
  • OrchestratorDeps não tem repository/uow/db/prisma: invariant arquitetural enforced por interface. Teste verifica keys não incluem esses campos.

- Atualizações em arquivos existentes:
  • packages/domain/src/discovery/index.ts: adicionado `export * from "./orchestrator"`.
  • Cabeçalho do index.ts atualizado para mencionar os 3 submodules (types, planner, orchestrator).

- Verificações (checklist de aceite):
  ✓ bunx tsc --noEmit → 0 errors
  ✓ bun run lint → 0 errors, 5 warnings cosméticos (preexistentes)
  ✓ bun run test:arch → 121 files, 0 violations (salto 110 → 121 com orchestrator module)
  ✓ bun test packages/domain/src/discovery/ → 37 pass, 0 fail (9 planner + 28 orchestrator)
  ✓ HTTP 200 em /
  ✓ Determinismo: mesmo plano + mesmo ctx em 2 orchestrators frescos → job IDs byte-identical
  ✓ Idempotência: mesmo plano processado 2x → mesmos jobs, sem duplicação, sem eventos extras
  ✓ executionKey muda quando workflowVersion bumpa → re-execution permitida
  ✓ executionKey muda quando providerManifestVersion bumpa → re-execution permitida
  ✓ Plano expirado (todos signals expired) → state="expired"
  ✓ Plano TTL excedido → state="expired"
  ✓ Orçamento insuficiente → state="failed"
  ✓ Reserva duplicada → ALREADY_RESERVED
  ✓ Plano vazio (sem categories/niches/keywords) → state="failed"
  ✓ Múltiplas regiões → 1 job por (source × region × category)
  ✓ Múltiplos providers → jobs distribuídos
  ✓ Cancelamento → reserva liberada, state="cancelled"
  ✓ Nenhuma chamada externa (test runtime <100ms)
  ✓ Nenhuma dependência de provider (deps sem provider)
  ✓ Nenhuma escrita direta em DB (deps sem repository/uow/db/prisma)

Stage Summary:

- A2.2 (Discovery Orchestrator) entregue e validado contra checklist completo.
- 9 arquivos em packages/domain/src/discovery/orchestrator/ (7 módulos + index + test).
- 6 interfaces definidas (PlanValidator, JobFactory, BudgetReservationService, ExecutionRegistry, OrchestratorEventPublisher, OrchestratorMetricsCollector) — prontas para A2.3 Workers consumir.
- 5 eventos tipados (2 de intent emitidos pelo Orchestrator, 3 de consummation reservados para Workers).
- Lifecycle explícito com 9 estados e apenas 2 transições de posse do Orchestrator (draft→reserved→scheduled).
- Idempotência via executionKey = FNV-1a(planId + planHash + workflowVersion + manifestVersion).
- 28 testes unitários passando cobrindo todos os cenários pedidos + invariantes arquiteturais.
- Próximo: A2.3 — Discovery Workers (execução dos jobs, transições scheduled→executing→completed|failed).

---

Task ID: A2.2-refinements + A2.3 — Discovery Workers
Agent: main (Super Z)
Task: (1) Aplicar 6 refinements em A2.2 (branded ExecutionKey, JobFactoryInput, structured validation errors, ReservationToken, versioned events, job parentPlanId+sequenceNumber). (2) Implementar A2.3 Discovery Workers em 10 módulos seguindo estrutura recomendada pelo usuário, com 11 critérios de aceite.

Work Log:

### Parte 1 — Refinements A2.2 (R1-R6)

- **R1. Branded ExecutionKeyValue**: adicionado `type ExecutionKeyValue = BrandedId<"ExecutionKeyValue">` e `type ReservationTokenValue = BrandedId<"ReservationTokenValue">`. Funções `asExecutionKeyValue()` e `asReservationTokenValue()` para trust boundaries. ExecutionKey.value agora é branded — não pode ser confundido com PlanId/JobId/hash.

- **R2. JobFactoryInput**: nova interface desacoplada de DiscoveryPlan. Contém apenas o que a factory precisa: executionKey, parentPlanId, sources, regions, languages, categories, niches, signals, budget, priority. Orchestrator constrói JobFactoryInput a partir do plan e chama `factory.createJobs(input, ctx)`. A2.3 Workers podem reusar a factory sem depender do Planner.

- **R3. Structured validation errors**: ValidationResult agora tem `severity: "error" | "warning"` e `retryable: boolean`. CODE_META map define severity+retryable por código (PLAN_EMPTY=error/false, PLAN_BUDGET_ZERO=error/true, etc.). failureReason do Orchestrator inclui `(severity, retryable=X)`.

- **R4. ReservationToken**: nova interface com `value: ReservationTokenValue` (branded), `executionKey`, `planId`, `reservedCalls`, `consumed`, `consumedCalls`, `createdAt`, `expiresAt`. BudgetReservationService tem novo método `consume(token, actualCallsUsed)` que debita calls reais e marca token como consumed. Double-consume retorna TOKEN_CONSUMED. Overage (actual > reserved) é reportado mas ainda debitado. OrchestratorResult.reservationToken agora retorna o token para Workers consumirem.

- **R5. Versioned events**: nova interface VersionedPayload com `schemaVersion: "1.0.0"`, `workflowVersion`, `plannerVersion`. Todos os 5 eventos (PlanScheduled, JobCreated, ExecutionStarted/Completed/Failed) carregam essas 3 versões. Factory functions `make*Event(versions, payload)` injetam as versões. ORCHESTRATOR_SCHEMA_VERSION = "1.0.0" constante. Facilita replay com upcasting.

- **R6. Job parentage**: DiscoveryJob (em discovery/types.ts) ganhou 2 campos: `parentPlanId: string` e `sequenceNumber: number`. JobFactory popula ambos. Job ID format mudou para `job_${planId}_${seq padded 4}_${execKeyShort}` — legível e determinístico. Event DiscoveryJobCreated inclui sequenceNumber no payload.

- **Testes**: 15 novos testes adicionados a orchestrator.test.ts cobrindo cada refinement (R1-R6). Total: 43 testes passando (28 originais + 15 novos).

### Parte 2 — A2.3 Discovery Workers (10 módulos)

Criado em packages/domain/src/discovery/workers/:

- **types.ts** (300 linhas): WorkerId, CheckpointId, ProviderCallId (branded). WorkerState (9 estados: idle/acquiring/executing/checkpointing/completed/failed/cancelled/rate_limited/retrying). DiscoveryConnector interface (providerCode + discover()). ConnectorDiscoverInput/Result. CancellationSignal (cooperative). Checkpoint + CheckpointStore. RetryPolicy + WorkerError. RateLimiter. ProviderSelector. WorkerConfig (timeoutMs, maxRetries, baseRetryDelayMs, maxRetryDelayMs, rateLimitPerMinute, checkpointInterval, maxItemsPerJob) + DefaultWorkerConfig. WorkerContext (com executionRegistry, reservationService, executor do Orchestrator). WorkerResult. WorkerMetricsSnapshot. WorkerMetricsCollector + WorkerEventPublisher. ProviderHealth re-declarado localmente (não importa de @workspace/providers — mantém domínio desacoplado).

- **events.ts** (45 linhas): factories emitExecutionStarted/Completed/Failed que delegam para makeExecution*Event do orchestrator/events, injetando versions.

- **metrics.ts** (60 linhas): InMemoryWorkerMetricsCollector (counters/gauges/timers via Map, snapshot() retorna WorkerMetricsSnapshot com discoveryDurationMs, checkpointDurationMs, rateLimitWaitMs, retryDelayMs, totalDurationMs, itemsProcessed, apiCallsUsed, retries, checkpointsSaved). NoopWorkerEventPublisher.

- **retry.ts** (45 linhas): ExponentialBackoffRetryPolicy (delay = min(maxRetryDelayMs, baseRetryDelayMs * 2^(attempt-1)) + jitter ±20%). NoRetryPolicy para testes/cancelled jobs.

- **rate-limit.ts** (115 linhas): TokenBucketRateLimiter per-provider. Bucket com capacity, tokens, lastRefill, waiters queue. Refill contínuo (sliding window approx). acquire() fast-path se token disponível, slow-path enfileira e espera. Cancellation signal cancela acquire. estimateWait() para observabilidade.

- **checkpoint.ts** (65 linhas): InMemoryCheckpointStore (load/save/clear). buildCheckpoint() factory. Idempotente para mesmo (jobId, page). Count() helper para testes.

- **provider-selection.ts** (52 linhas): DefaultProviderSelector. Select por job.providerCode. Se não encontrado, throws WorkerError com code="NO_PROVIDER", retriable=false (estruturado, não Error genérico).

- **result.ts** (115 linhas): Builders completed/failed/cancelled para WorkerResult. WorkerErrors factory: timeout (retriable), providerError (retriable), rateLimited (retriable), cancelled (non-retriable), unknown (non-retriable), noProvider (non-retriable), overQuota (retriable).

- **executor.ts** (190 linhas): JobExecutor.fetch() — single-fetch com retry/timeout/rate-limit. Fluxo: acquire rate-limit slot → withTimeout(connector.discover(), timeoutMs) → on success return FetchResult. On failure: toWorkerError, se non-retriable throw, se cancelled throw, se retryPolicy.nextDelay()=null throw, senão sleep com cancellation awareness e retry. withTimeout() race entre promise e setTimeout. sleep() com onCancel. Executor anexa `attempts` count ao erro para o Worker reportar.

- **worker.ts** (325 linhas): DiscoveryWorker.execute(job, ctx) — paging coordinator. Fluxo: (1) markState executing + emit ExecutionStarted, (2) load checkpoint, (3) select provider, (4) loop: executor.fetch + accumulate + checkpoint + safety cap check, (5) cancellation check, (6) consume reservation token, (7) markState completed + emit ExecutionCompleted. catch: se cancellation (signal.cancelled OR error.code==="CANCELLED") → handleCancellation; senão → handleFailure. handleFailure tenta consume token para calls já feitas, marca failed, emite ExecutionFailed. handleCancellation marca cancelled, emite ExecutionFailed (retriable=false). Stateless — todo estado em WorkerContext.

- **index.ts**: barrel export dos 10 módulos.

- **worker.test.ts** (960 linhas): 24 testes em 13 describe blocks cobrindo todos os 11 critérios de aceite + 2 extras:
  • Deterministic execution (mesmo job + ctx → mesmo productsDiscovered)
  • Incremental checkpoint (save após cada página, resume)
  • Exponential retry (retry em transient, não-retry em fatal, give up após maxRetries)
  • Rate limiting per-provider (isolado entre providers)
  • Configurable timeout (fire quando lento, completa quando suficiente)
  • Cooperative cancellation (aborta quando signal fire, marca registry cancelled)
  • Idempotency by JobId (re-run completa sem crash)
  • Per-provider metrics (apiCallsUsed, itemsProcessed, checkpointsSaved)
  • Events Started/Completed/Failed emitidos com versions
  • No catalog access (deps sem catalogRepository/productRepository/db/prisma)
  • No Planner calls (deps sem planner/plannerContext)
  • Reservation token consume (success + partial failure)
  • Provider selection (NO_PROVIDER quando vazio)
  • Safety cap (stop após maxItemsPerJob)

### Decisões de design

- **ProviderHealth re-declarado em workers/types.ts**: mantém domínio desacoplado de @workspace/providers. Structurally identical — consumers em @workspace/providers satisfazem o contrato sem o domínio depender do package.
- **WorkerContext inclui executionRegistry + reservationService + executor**: em vez de WorkerDeps separado, tudo no ctx. Worker é stateless — só tem execute(job, ctx).
- **Cancellation routing no catch**: worker detecta CANCELLED errors (por signal.cancelled OR error.code) e rota para handleCancellation em vez de handleFailure.
- **Executor anexa attempts ao erro**: quando o executor throws, ele anexa `{ attempts: N }` ao erro para o Worker reportar tentativas mesmo em failure.
- **Safety cap**: para após itemsProcessed >= maxItemsPerJob, mas NÃO trunca mid-page (página é atômica). Teste ajustado para refletir isso.
- **ReservationToken consume em failure**: se apiCallsUsed > 0 em failure, worker tenta consume (partial debit). Se apiCallsUsed = 0, não consume.

### Atualizações em arquivos existentes

- packages/domain/src/discovery/index.ts: adicionado `export * from "./workers"`.
- packages/domain/src/discovery/types.ts: adicionado parentPlanId + sequenceNumber em DiscoveryJob.
- packages/domain/src/discovery/orchestrator/types.ts: refinements R1-R6 (branded types, JobFactoryInput, structured validation, ReservationToken, versioned events).
- packages/domain/src/discovery/orchestrator/interfaces.ts: JobFactory.createJobs aceita JobFactoryInput; BudgetReservationService tem consume().
- packages/domain/src/discovery/orchestrator/events.ts: VersionedPayload em todos os 5 eventos; factories aceitam versions param.
- packages/domain/src/discovery/orchestrator/validator.ts: ValidationResult com severity + retryable; CODE_META map.
- packages/domain/src/discovery/orchestrator/reservation.ts: ReservationToken pattern; consume() com overage detection; double-consume rejeitado.
- packages/domain/src/discovery/orchestrator/job-factory.ts: aceita JobFactoryInput; jobs carregam parentPlanId + sequenceNumber.
- packages/domain/src/discovery/orchestrator/orchestrator.ts: constrói JobFactoryInput; retorna reservationToken; injeta versions em eventos.
- packages/domain/src/discovery/orchestrator/orchestrator.test.ts: 15 novos testes R1-R6.

### Verificações (checklist de aceite A2.3)

- ✓ bunx tsc --noEmit → 0 errors
- ✓ bun run lint → 0 errors, 5 warnings cosméticos (preexistentes)
- ✓ bun run test:arch → 133 files, 0 violations (salto 121 → 133 com workers module)
- ✓ bun test packages/domain/src/discovery/ → 76 pass, 0 fail (9 planner + 43 orchestrator + 24 worker)
- ✓ HTTP 200 em /
- ✓ execução determinística (mesmo job + ctx → mesmo productsDiscovered)
- ✓ checkpoint incremental (save após cada página, resume)
- ✓ retry exponencial (jitter ±20%, maxRetryDelayMs cap)
- ✓ rate limiting per provider (token bucket isolado)
- ✓ timeout configurável (withTimeout race)
- ✓ cancelamento cooperativo (signal + error.code=CANCELLED routing)
- ✓ idempotência por JobId (re-run completa)
- ✓ métricas por provider (apiCallsUsed, itemsProcessed, retries, checkpointsSaved)
- ✓ eventos Started/Completed/Failed (com schemaVersion + workflowVersion + plannerVersion)
- ✓ nenhum acesso ao catálogo (deps sem catalogRepository/productRepository/db/prisma)
- ✓ nenhuma chamada ao Planner (deps sem planner/plannerContext)
- ✓ consome ReservationToken do Orchestrator (A2.2 → A2.3 handoff)

Stage Summary:

- A2.2 refinements (R1-R6) entregues: branded types, JobFactoryInput decoupled, structured validation, ReservationToken pattern, versioned events, job parentage. 15 novos testes, 43 total passando.
- A2.3 Discovery Workers entregue em 10 módulos modulares (types, events, metrics, retry, rate-limit, checkpoint, provider-selection, result, executor, worker) + index + test. 24 testes passando cobrindo todos os 11 critérios de aceite.
- Pipeline A2.1→A2.2→A2.3 completo: Planner → Orchestrator → Workers. Handoff via ReservationToken. Lifecycle: draft → reserved → scheduled → executing → completed | failed | cancelled.
- 133 arquivos verificados, 0 violations. 76 testes passando no discovery module.
- Próximo: A2.4 — Raw Product Store (persistir NormalizedDiscoveredProduct[] bruto).

---

Task ID: A2.3-contracts — Cross-cutting contracts (C1-C5)
Agent: main (Super Z)
Task: Incorporar 5 contratos transversais aos módulos A2.3 existentes, sem criar novos bounded contexts: RetryPolicyConfig (declarativo), ProviderSelectionPolicy (4 estratégias swappable), ErrorTaxonomy (11 códigos padronizados), ProviderSnapshot (audit trail), DiscoveryExecutionResult (contract de observabilidade).

Work Log:

### C1. RetryPolicyConfig (declarative)

- Criado `contracts.ts` com `RetryPolicyConfig` (data) separado de `RetryPolicy` (behavior, já existente em types.ts).
- 3 backoff strategies suportadas: `"fixed" | "linear" | "exponential"`.
- `computeRetryDelay(config, attempt)` — pure function. Fixed = baseDelayMs. Linear = baseDelayMs * attempt. Exponential = baseDelayMs * 2^(attempt-1). Todas com cap maxDelayMs e jitter ±20% opcional.
- `isRetriableError(config, errorCode, errorRetriableFlag)` — se retryableErrors vazio, defer para flag do erro; se não-vazio, só retry códigos na lista.
- `ConfigurableRetryPolicy` — nova classe que interpreta RetryPolicyConfig. Substitui ExponentialBackoffRetryPolicy como implementação padrão.
- `ExponentialBackoffRetryPolicy` mantida para backwards-compat (delega para ConfigurableRetryPolicy com backoffStrategy="exponential").
- `workerConfigToRetryPolicy(config)` — bridge de WorkerConfig legado para RetryPolicyConfig declarativo.
- DefaultRetryPolicyConfig exportado (maxAttempts=4, exponential, base=500ms, max=30s, jitter=true).

### C2. ProviderSelectionPolicy (4 estratégias + exact)

- `ProviderSelectionInput`: capability, region, candidates[].
- `ProviderCandidate`: providerCode, providerVersion, health, costScore (0-100), latencyMs, priority (0-100).
- `ProviderSelectionOutput`: providerCode, reason, rejected[].
- 5 estratégias implementadas:
  • `CheapestProviderPolicy` — lowest costScore, ties por priority.
  • `FastestProviderPolicy` — lowest latencyMs, ties por priority.
  • `HealthiestProviderPolicy` — status rank (healthy>degraded>offline), ties por errorRate depois priority.
  • `WeightedProviderPolicy` — score = priority*0.5 + (100-cost)*0.25 + (100-errorRate)*0.25. Weights customizáveis.
  • `ExactProviderPolicy` — match por requestedCode. Usado quando job especifica provider.
- `createSelectionPolicy(strategy, options?)` — factory que instancia a estratégia correta.
- `DefaultProviderSelector` (provider-selection.ts) atualizado para delegar a ProviderSelectionPolicy. Se nenhuma policy injetada, usa ExactProviderPolicy com job.providerCode.
- `createProviderSelectorWithStrategy(strategy, options?)` — convenience factory.

### C3. ErrorTaxonomy (11 códigos padronizados)

- `ErrorTaxonomy` const com 11 códigos: RATE_LIMIT, NETWORK, AUTH, TIMEOUT, INVALID_RESPONSE, BAD_DATA, NOT_FOUND, CANCELLED, NO_PROVIDER, OVER_QUOTA, UNKNOWN.
- `canonicalizeErrorCode(code)` — migra códigos legados (PROVIDER_ERROR→NETWORK, RATE_LIMITED→RATE_LIMIT) e mapeia desconhecidos para UNKNOWN.
- `DEFAULT_RETRIABILITY` — map de code→boolean. Transient (RATE_LIMIT, NETWORK, TIMEOUT, INVALID_RESPONSE, OVER_QUOTA) = true. Permanent (AUTH, BAD_DATA, NOT_FOUND, CANCELLED, NO_PROVIDER, UNKNOWN) = false.
- `WorkerErrors` factory (result.ts) atualizado: todos os 11 factories agora usam ErrorTaxonomy codes e DEFAULT_RETRIABILITY. Novos factories: `network()`, `auth()`, `invalidResponse()`, `badData()`, `notFound()`. `fromCode(code, msg)` canonicaliza códigos legados.

### C4. ProviderSnapshot (audit trail)

- `ProviderSnapshotId` branded type.
- `ProviderSnapshot` interface: id, providerCode, providerVersion, manifestVersion, capturedAt, health{status, errorRate, averageLatencyMs, consecutiveFailures, totalRequests}, rateLimit{requestsRemaining, resetAt, limitPerMinute}.
- `buildProviderSnapshot(params)` — factory que captura estado imutável do provider no momento do início da execução. ID único com random suffix. Anexado ao DiscoveryExecutionResult para auditoria — sabe exatamente qual estado do provider gerou aquele resultado.

### C5. DiscoveryExecutionResult (observability contract)

- `DiscoveryExecutionResult` interface: jobId, planId, executionKey, providerId, providerSnapshot, status (succeeded|failed|cancelled), durationMs, attempts, apiCallsUsed, productsDiscovered, productsNormalized, nextCursor, hasMore, warnings[], errors[]{code, message, retriable}, metrics{discoveryDurationMs, checkpointDurationMs, rateLimitWaitMs, retryDelayMs, itemsProcessed, retries, checkpointsSaved}, schemaVersion, workflowVersion, plannerVersion, completedAt.
- `DISCOVERY_RESULT_SCHEMA_VERSION = "1.0.0"` constante.
- `toDiscoveryExecutionResult(params)` mapper em result.ts: converte WorkerResult (perspectiva interna do worker) → DiscoveryExecutionResult (perspectiva externa de observabilidade). Canonicaliza error codes automaticamente.

### Mapeamento dos 10 módulos aos 4 slices

Atualizado `index.ts` com cabeçalho documentando o mapeamento:

- **A2.3.1 Worker Engine**: worker.ts (paging coordinator), executor.ts (single-fetch retry/timeout/rate-limit), provider-selection.ts (delega a ProviderSelectionPolicy)
- **A2.3.2 Connector Executor**: types.ts (DiscoveryConnector contract), rate-limit.ts (TokenBucketRateLimiter per-provider)
- **A2.3.3 Checkpoint**: checkpoint.ts (In-memory CheckpointStore + buildCheckpoint)
- **A2.3.4 Events**: events.ts (factories Started/Completed/Failed), metrics.ts (WorkerMetricsCollector + NoopEventPublisher), result.ts (WorkerResult builders + WorkerErrors + toDiscoveryExecutionResult)
- **Cross-cutting**: contracts.ts (C1-C5), retry.ts (ConfigurableRetryPolicy)

### Testes (contracts.test.ts, 450 linhas, 39 testes)

- C1 RetryPolicyConfig (12 testes): computeRetryDelay para fixed/linear/exponential, cap maxDelayMs, jitter range ±20%, isRetriableError com lista vazia/não-vazia, ConfigurableRetryPolicy respeita maxAttempts, rejeita non-retriable, filtra por retryableErrors, NoRetryPolicy nunca retry.
- C2 ProviderSelectionPolicy (12 testes): Cheapest seleciona lowest costScore + tie por priority + empty case. Fastest seleciona lowest latency. Healthiest prefere healthy>degraded>offline + tie por errorRate. Weighted computa score com weights default + custom. Exact match + no-match. Factory cria cada estratégia + throw sem requestedCode.
- C3 ErrorTaxonomy (8 testes): 11 códigos expostos, canonicalizeErrorCode pass-through + migration + unknown→UNKNOWN, DEFAULT_RETRIABILITY transient vs permanent, WorkerErrors factory produz códigos canônicos + retriable flag + fromCode canonicaliza.
- C4 ProviderSnapshot (2 testes): build imutável com health/rateLimit, IDs únicos.
- C5 DiscoveryExecutionResult (5 testes): map completed→succeeded, failed→failed com error details, cancelled→cancelled, canonicaliza legacy codes, schemaVersion 1.0.0.

### Verificações

- ✓ bunx tsc --noEmit → 0 errors
- ✓ bun run lint → 0 errors, 5 warnings cosméticos (preexistentes)
- ✓ bun run test:arch → 135 files, 0 violations (salto 133 → 135 com contracts.ts + contracts.test.ts)
- ✓ bun test packages/domain/src/discovery/ → 115 pass, 0 fail (9 planner + 43 orchestrator + 24 worker + 39 contracts)
- ✓ HTTP 200
- ✓ Nenhum novo bounded context criado (apenas contracts.ts dentro do módulo workers existente)
- ✓ Nenhum ADR estrutural necessário (contratos são refinamentos dentro do módulo A2.3)
- ✓ Backwards-compatível: ExponentialBackoffRetryPolicy e DefaultProviderSelector mantêm API legada

Stage Summary:

- 5 contratos transversais (C1-C5) incorporados aos módulos A2.3 existentes sem criar novos bounded contexts.
- contracts.ts (470 linhas) centraliza os 5 contratos. retry.ts, provider-selection.ts, result.ts atualizados para implementá-los.
- 39 novos testes em contracts.test.ts cobrindo todos os 5 contratos.
- 115 testes totais passando no discovery module (9 planner + 43 orchestrator + 24 worker + 39 contracts).
- Arquitetura permanece estável. Esforço direcionado para value delivery: próximo é A2.4 — Raw Product Store (persistir NormalizedDiscoveredProduct[] produzido pelos Workers).

---

Task ID: A2.4 — Raw Product Store
Agent: main (Super Z)
Task: Implementar Raw Product Store append-only com dual-hash, versionamento completo, compressão transparente, partition key, eventos desacoplados (RawProductsPersisted + RawProductsReadyForNormalization), stream de leitura, e idempotência para reprocessamento. 37 testes cobrindo 10 critérios de aceite.

Work Log:

### Módulo criado em packages/domain/src/discovery/raw-store/ (7 arquivos + index + test):

- **types.ts** (175 linhas): DiscoveryExecutionId + RawProductRecordId (branded). RawStoreVersions (6 campos: schemaVersion, workflowVersion, plannerVersion, providerVersion, connectorVersion, providerManifestVersion). RAW_STORE_SCHEMA_VERSION = "1.0.0". DiscoveryExecution (audit record: id, executionKey, planId, jobId, providerCode, providerSnapshot, status, startedAt, completedAt, durationMs, attempts, apiCallsUsed, productsDiscovered, reservationConsumed, metrics, versions, partitionKey, error?). RawProductRecord (payload record: id, executionId, providerCode, externalId, payload: Uint8Array, payloadHash, semanticHash: null, discoveredAt, partitionKey, versions). buildPartitionKey(provider, country, date) → `provider|country|yyyy-mm-dd`. RawProductRepository interface (appendExecution, appendProducts, findExecution, findProducts, streamProducts: AsyncIterable, countProducts — NO update/delete). StreamFilter (executionId?, providerCode?, partitionKey?, since?, until?). RawStoreCoordinatorInput + RawStoreCoordinatorResult.

- **hashing.ts** (70 linhas): canonicalJsonStringify(value) — stable key order via recursive sort. computePayloadHash(payload) — FNV-1a 32-bit duas passadas (forward+backward+cross-mix) sobre canonical JSON. Retorna `ph_${16 hex chars}`. computeSemanticHash(_normalized) — stub retorna null em A2.4 (será implementado por A2.5 Normalizer baseado em title+brand+category+attributes+price band). NUNCA misturar payloadHash (identidade byte-level) com semanticHash (identidade semântica pós-normalização).

- **compression.ts** (90 linhas): Compressor interface (compress/decompress suportam sync OU async para flexibilidade). NoopCompressor (UTF-8 via TextEncoder/TextDecoder, dev default). GzipCompressor (dynamic import de node:zlib, lazy init, async compress/decompress). getDefaultCompressor/setDefaultCompressor/createNoopCompressor/createGzipCompressor factories.

- **events.ts** (135 linhas): RAW_STORE_EVENT_TYPES = ["discovery.raw.persisted", "discovery.raw.ready_for_normalization"]. RawStoreVersionedPayload (schemaVersion + 4 version fields). RawProductsPersistedPayload (executionId, executionKey, planId, jobId, providerCode, count, skipped, payloadHashes, partitionKey, durationMs). RawProductsReadyForNormalizationPayload (executionId, providerCode, count, partitionKeys). 2 event types + 2 factories (makeRawProductsPersistedEvent, makeRawProductsReadyForNormalizationEvent) com version injection.

- **repository.ts** (110 linhas): InMemoryRawProductRepository. executions Map, products Map (por execution), hashIndex Map (executionId → Set<payloadHash> para idempotency check). appendExecution idempotente (mesmo executionId → retorna existing). appendProducts idempotente (mesmo (executionId, payloadHash) → skip). findExecution, findProducts. streamProducts: AsyncGenerator com filtros (executionId, providerCode, partitionKey, since, until). countProducts. executionCount/productCount getters. clear() para testes.

- **coordinator.ts** (155 linhas): RawStoreCoordinator.persist(input). Fluxo: (1) makeExecutionId(executionKey, jobId) determinístico, (2) buildPartitionKey, (3) build DiscoveryExecution, (4) appendExecution idempotente, (5) para cada produto: canonicalJsonStringify + computePayloadHash + compressor.compress + build RawProductRecord, (6) appendProducts idempotente, (7) emit RawProductsPersisted, (8) se appended > 0: emit RawProductsReadyForNormalization. makeExecutionId e makeRecordId determinísticos (mesmo input → mesmo ID → idempotência). RawStoreCoordinatorDeps (repository, compressor?, events?).

- **coordinator.test.ts** (580 linhas): 37 testes em 10 describe blocks cobrindo todos os 10 critérios de aceite + extras:
  • Raw payload preservation (3): round-trip NoopCompressor, round-trip GzipCompressor, gzip < original para repetitive payloads
  • Append-only semantics (3): sem update/delete no prototype, só append+find+stream+count, idempotente em re-append
  • PayloadHash (4): determinístico de canonical JSON, mesmo hash independente de property order, hashes diferentes para payloads diferentes, skip duplicatas dentro mesma execução
  • SemanticHash (2): null em A2.4, separado de payloadHash
  • ProviderSnapshot (2): persistido em execution record, preserva health metadata completo
  • Full versioning (2): 6 version fields em execution, 6 version fields em cada record
  • Compression (2): Uint8Array armazenado, swap noop↔gzip transparente
  • Events (5): 2 eventos emitidos, payload com count+hashes+partitionKey, partitionKeys em ReadyForNormalization, não emite Ready quando 0 products, versions em payloads
  • Stream reads (5): stream por execution, filter por providerCode, filter por partitionKey, countProducts, stream one-at-a-time (10 products)
  • Reprocessing (4): safe re-run (no duplicates), mesmo execution ID, mesmas payloadHashes (from stored), re-import com different compressor
  • Partition key (3): format provider|country|yyyy-mm-dd, UTC date, partition key em cada record
  • Failed execution (2): persiste status=failed com error details, não emite ReadyForNormalization

### Atualizações em arquivos existentes:

- **packages/domain/src/discovery/types.ts**: removido RawProductRecord/RawProductRecordId legados (movidos para raw-store/types.ts com design mais rico).
- **packages/domain/src/discovery/workers/types.ts**: adicionado `products?: ReadonlyArray<NormalizedDiscoveredProduct>` ao WorkerResult. Present apenas quando state==="completed". Consumido por A2.4 RawStoreCoordinator.
- **packages/domain/src/discovery/workers/worker.ts**: acumula produtos em `allProducts[]` durante paging loop. Passa `products: allProducts` para `completed()`.
- **packages/domain/src/discovery/workers/result.ts**: `completed()` aceita `products?` param e inclui no WorkerResult.
- **packages/domain/src/discovery/index.ts**: adicionado `export * from "./raw-store"`.

### Design decisions:

- **Duas entidades separadas**: DiscoveryExecution (audit: quem, quando, qual provider, qual versão, métricas) vs RawProductRecord (payload: bytes comprimidos, hash, partition key). Permite responder "qual execução produziu esse produto? qual provider? qual versão?".
- **Dual hash**: payloadHash (FNV-1a sobre canonical JSON — replay/cache/audit) vs semanticHash (null em A2.4, preenchido por A2.5 Normalizer — deduplicação). Nunca misturar.
- **Append-only**: repository não tem update/delete. Re-append de mesmo (executionId, payloadHash) é no-op. Preserva histórico completo — quando fornecedor altera anúncio amanhã, grava outro RawRecord.
- **Compressão transparente**: Compressor interface suporta sync (Noop) e async (Gzip). Coordinator usa `await compressor.compress()` — funciona para ambos. Gzip usa dynamic import de node:zlib (lazy, evita require() lint error).
- **Partition key**: `provider|country|yyyy-mm-dd` (UTC). Previsto para escala global — migra facilmente para particionamento nativo PostgreSQL ou sharding.
- **Eventos desacoplados**: RawProductsPersisted (raw bytes safely stored) + RawProductsReadyForNormalization (downstream Normalizer may consume). Split permite re-rodar normalização sem re-persistir.
- **Stream de leitura**: `streamProducts(filter): AsyncIterable<RawProductRecord>` — downstream consumer (A2.5) lê um por vez sem carregar tudo na memória.
- **Idempotência determinística**: executionId = `exec_${executionKey}_${jobId}`, recordId = `raw_${executionId}_${payloadHash}`. Mesmo input → mesmo ID → re-persist é no-op.
- **Full versioning**: cada record carrega schemaVersion + workflowVersion + plannerVersion + providerVersion + connectorVersion + providerManifestVersion. Salva meses de investigação futura.

### Verificações (checklist de aceite):

- ✓ bunx tsc --noEmit → 0 errors
- ✓ bun run lint → 0 errors, 5 warnings cosméticos (preexistentes)
- ✓ bun run test:arch → 143 files, 0 violations (salto 135 → 143 com raw-store module)
- ✓ bun test packages/domain/src/discovery/ → 152 pass, 0 fail (9 planner + 43 orchestrator + 24 worker + 39 contracts + 37 raw-store)
- ✓ HTTP 200
- ✓ Payload bruto preservado exatamente (round-trip Noop + Gzip)
- ✓ Append-only (sem update/delete no repository)
- ✓ PayloadHash (FNV-1a sobre canonical JSON, determinístico)
- ✓ SemanticHash separado (null em A2.4, preenchido por A2.5)
- ✓ ProviderSnapshot persistido em DiscoveryExecution
- ✓ Versionamento completo (6 version fields em execution + records)
- ✓ Compressão transparente (Noop + Gzip swap via interface)
- ✓ Eventos publicados (RawProductsPersisted + RawProductsReadyForNormalization)
- ✓ Stream de leitura (AsyncIterable com filtros)
- ✓ Reprocessamento possível (idempotente, mesmo IDs, sem duplicatas)

Stage Summary:

- A2.4 (Raw Product Store) entregue e validado contra checklist completo.
- 7 arquivos em packages/domain/src/discovery/raw-store/ (types, hashing, compression, events, repository, coordinator, index) + coordinator.test.ts.
- Pipeline A2.1→A2.2→A2.3→A2.4 completo: Signals → Planner → Plans → Orchestrator → Jobs → Workers → NormalizedDiscoveredProduct → RawStoreCoordinator → RawProductRepository (append-only, compressed, dual-hash, partitioned).
- 152 testes totais passando no discovery module.
- Próximo: A2.5 — Normalizer (consome RawProductsReadyForNormalization, preenche semanticHash, produz produtos normalizados para A2.6 Similarity).

---

Task ID: A2.5 — Product Normalizer
Agent: main (Super Z)
Task: Implementar Product Normalizer seguindo 10 refinamentos: produz novo artefato (NormalizedProductRecord), semanticHash movido do Raw para o Normalized, versionamento completo do normalizer (4 versões), 7 estágios swappable, atributos canônicos marketplace-agnostic, price bands, perceptual hash, 9 métricas de qualidade, 4 eventos, interface aceita record completo. Também limpar RawProductRecord removendo semanticHash (mantém Raw Store estritamente imutável).

Work Log:

### Pre-A2.5: Raw Store cleanup (R1+R2)

- Removido `semanticHash` de `RawProductRecord` em raw-store/types.ts. Raw Store agora estritamente imutável — apenas dados adquiridos, nada derivado.
- Removido `computeSemanticHash` stub de raw-store/hashing.ts.
- Atualizado raw-store/coordinator.ts para não setar semanticHash.
- Atualizados testes A2.4: agora verificam que semanticHash é undefined em RawProductRecord (em vez de null).

### A2.5: 11 módulos em packages/domain/src/discovery/normalizer/

- **types.ts** (200 linhas): NormalizedProductRecordId + NormalizationBatchId (branded). NormalizerVersions (4 fields: normalizerVersion, taxonomyVersion, attributeDictionaryVersion, translationModelVersion). DefaultNormalizerVersions. NORMALIZER_SCHEMA_VERSION = "1.0.0". CanonicalAttributeName const (17 nomes: COLOR, SIZE, MATERIAL, BRAND, WEIGHT, DIMENSIONS, GENDER, STYLE, PATTERN, SLEEVE_LENGTH, NECKLINE, OCCASION, SEASON, CAPACITY, VOLTAGE, POWER, CONNECTOR_TYPE). CanonicalAttribute (name, value, confidence, sourceAttribute). PriceBand union (10 bands: "0-10" até "5000+"). NormalizedPrice (band, currency, originalAmount). NormalizedImage (url, phash, sha256?). NormalizedProductRecord (id, rawProductId, executionId, payloadHash, semanticHash, normalizedTitle/Brand/Category/Attributes/Images/Price, providerCode, externalId, region, language, discoveredAt, normalizedAt, partitionKey, normalizerVersions, rawVersions, schemaVersion, confidenceScore, warnings). 7 NormalizationStageName. NormalizationStageResult<T>. NormalizationMetrics (9 counters + durationMs). ProductNormalizer interface. NormalizedProductRepository interface (append, appendBatch, findById, findByRawProductId, findBySemanticHash, stream, count). NormalizationCoordinatorInput + Result.

- **canonical-attributes.ts** (135 linhas): ATTRIBUTE_ALIASES map com 80+ aliases em 8 idiomas (EN, PT, ES, FR, DE, IT, ZH, RU). canonicalizeAttributeName(rawName) → CanonicalAttributeName | null. canonicalizeAttribute(rawName, rawValue) → CanonicalAttribute | null. canonicalizeAttributes(rawAttributes) → CanonicalAttribute[]. getKnownAttributeNames(). Marketplace-agnostic: "颜色", "Color", "Colour", "Cor" → todos mapeiam para COLOR. NUNCA "AliExpressColor".

- **price-bands.ts** (60 linhas): BAND_BOUNDARIES (9 bandas com min/max + "5000+"). classifyPriceBand(amount) → PriceBand. normalizePrice(amount, currency) → NormalizedPrice (band + currency + originalAmount preservado). getAllPriceBands() → 10 bands. Preço normalizado para bandas porque preço muda diariamente — bandas são estáveis e comparáveis.

- **image-hash.ts** (75 linhas): ImageHasher interface (computePhash, computeSha256?, hammingDistance, algorithm). StubImageHasher (deterministic hash from URL, hamming distance char-level). getDefaultImageHasher/setDefaultImageHasher/createStubImageHasher. Production deve swap por implementação real (sharp/jimp/AI vision). phash ≠ SHA: phash produce hashes similares para imagens visualmente similares (dedup), SHA é exact match.

- **stages.ts** (210 linhas): 7 stage interfaces (TitleNormalizer, BrandNormalizer, CategoryNormalizer, AttributeNormalizer, ImageNormalizer, PriceNormalizer, SemanticHasher). StageContext (providerCode, region, language). 7 default implementations: DefaultTitleNormalizer (trim, collapse whitespace, remove [Free Shipping] prefixes). DefaultBrandNormalizer (trim, title-case, aliases para Nike/Adidas/Samsung/etc). DefaultCategoryNormalizer (trim, uppercase, replace spaces com _). DefaultAttributeNormalizer (usa canonical-attributes dictionary). DefaultImageNormalizer (computa phash para cada URL). DefaultPriceNormalizer (classifica em bandas). DefaultSemanticHasher (FNV-1a over title|brand|category|priceBand|attributes ordenados). Cada stage retorna NormalizationStageResult<T> com value, warnings, confidence.

- **events.ts** (165 linhas): NORMALIZER_EVENT_TYPES = 4 tipos: "discovery.normalization.started", "discovery.normalization.completed", "discovery.normalization.products_created", "discovery.normalization.semantic_hashes_generated". NormalizerVersionedPayload (schemaVersion + 4 version fields). 4 payload interfaces. 4 event types. 4 factories (makeNormalizationStartedEvent, makeNormalizationCompletedEvent, makeNormalizedProductsCreatedEvent, makeSemanticHashesGeneratedEvent) com version injection. A2.6 Similarity consome NormalizedProductsCreated.

- **metrics.ts** (65 linhas): InMemoryNormalizationMetricsCollector. 9 counters: titlesNormalized, brandsResolved, attributesMapped, categoriesMapped, imagesProcessed, semanticHashesCreated, unknownBrands, unknownCategories. attributeCoverage (productsWithAttributes / productsTotal). durationMs. start/increment*/snapshot/reset.

- **repository.ts** (95 linhas): InMemoryNormalizedProductRepository. byId Map, byRawProductId Map (reverse lookup), bySemanticHash Map (para A2.7 Dedup). append idempotente (mesmo id → no-op). appendBatch. findById. findByRawProductId. findBySemanticHash. stream (AsyncIterable com filtros: executionId, providerCode, partitionKey, since, until). count. recordCount getter. clear().

- **normalizer.ts** (135 linhas): DefaultProductNormalizer implementa ProductNormalizer. Aceita NormalizerVersions + NormalizerDeps opcional (7 stages injetáveis). normalize(record: RawProductRecord, product: NormalizedDiscoveredProduct) → NormalizedProductRecord. Fluxo: extrai StageContext do record (providerCode, region do partitionKey, language). Executa 7 stages em sequência, coleta warnings + confidence. makeId determinístico: `norm_${rawProductId}_${normalizerVersion}_${semanticHash}` (idempotente: mesmo raw + mesma version → mesmo ID). Retorna NormalizedProductRecord completo com rawVersions preservado, schemaVersion, confidenceScore (média das 7 stages), warnings.

- **coordinator.ts** (110 linhas): NormalizationCoordinator.normalizeBatch(input). Fluxo: (1) makeBatchId determinístico, (2) emit NormalizationStarted, (3) para cada (record, product): normalizer.normalize + repository.append + update metrics, (4) emit NormalizedProductsCreated + SemanticHashesGenerated se normalized > 0, (5) emit NormalizationCompleted com metrics. 4 eventos publicados. A2.6 consome NormalizedProductsCreated.

- **index.ts**: barrel exports dos 11 módulos.
- **normalizer.test.ts** (490 linhas): 31 testes em 11 describe blocks cobrindo todos os 10 refinamentos R1-R10 + repository + confidence/warnings.

### Decisões de design

- **NormalizedProductRecord é um novo artefato**: nunca modifica RawProductRecord. Raw Store permanece estritamente imutável. Reprocessamento com nova versão do normalizer produz novos NormalizedProductRecords sem sobrescrever antigos.
- **semanticHash mora no Normalized, não no Raw**: é um valor derivado pós-normalização. Mover para NormalizedProductRecord preserva a separação dados adquiridos vs dados processados.
- **4 version fields no NormalizerVersions**: normalizerVersion (lógica), taxonomyVersion (categorias), attributeDictionaryVersion (dicionário de atributos), translationModelVersion (IA de tradução). Bumpar qualquer um permite reprocessar tudo com nova versão.
- **7 stages swappable**: cada stage é uma interface com default implementation. Trocar TitleNormalizer de regex-based para AI-based muda apenas uma classe. O normalizer orquestra, não implementa.
- **CanonicalAttribute marketplace-agnostic**: COLOR nunca AliExpressColor. Dicionário com 80+ aliases em 8 idiomas. Unknown attributes são skipados (não armazenados).
- **Price bands**: 10 bandas (0-10 até 5000+). Preço absoluto preservado em originalAmount mas band é a forma canônica. Preço muda diariamente; bandas são estáveis.
- **Perceptual hash (phash)**: interface ImageHasher com StubImageHasher (deterministic from URL). Production swap por sharp/jimp/AI. phash ≠ SHA: phash dedup visual, SHA exact match.
- **9 métricas de qualidade**: titlesNormalized, brandsResolved, attributesMapped, categoriesMapped, imagesProcessed, semanticHashesCreated, unknownBrands, unknownCategories, attributeCoverage. Permitem monitorar qualidade dos dados e detectar drift.
- **4 eventos desacoplados**: NormalizationStarted (batch started), NormalizedProductsCreated (A2.6 consome), SemanticHashesGenerated (A2.7 consome), NormalizationCompleted (com metrics). Split permite re-executar sem re-normalizar.
- **Idempotência determinística**: normalizedId = `norm_${rawProductId}_${normalizerVersion}_${semanticHash}`. batchId = `batch_${executionId}_${normalizerVersion}`. Mesmo input + mesma version → mesmo ID → re-normalize é no-op.

### Verificações

- ✓ bunx tsc --noEmit → 0 errors
- ✓ bun run lint → 0 errors, 5 warnings cosméticos (preexistentes)
- ✓ bun run test:arch → 155 files, 0 violations (salto 143 → 155 com normalizer module)
- ✓ bun test packages/domain/src/discovery/ → 183 pass, 0 fail (9 planner + 43 orchestrator + 24 worker + 39 contracts + 37 raw-store + 31 normalizer)
- ✓ HTTP 200
- ✓ R1: NormalizedProductRecord é novo artefato, Raw não modificado
- ✓ R2: semanticHash no Normalized, não no Raw
- ✓ R3: 4 version fields no NormalizerVersions
- ✓ R4: 7 stages swappable (testado com custom Title/Brand)
- ✓ R5: marketplace-agnostic (color/colour/cor/颜色 → COLOR)
- ✓ R6: 10 price bands (0-10 até 5000+)
- ✓ R7: phash computed para cada image
- ✓ R8: 9 métricas tracked via coordinator
- ✓ R9: 4 eventos emitted em ordem (Started → ProductsCreated → SemanticHashesGenerated → Completed)
- ✓ R10: normalize(record) aceita record completo, usa providerCode/partitionKey/versions

Stage Summary:

- A2.5 (Product Normalizer) entregue e validado contra todos os 10 refinamentos.
- 11 arquivos em packages/domain/src/discovery/normalizer/ (types, canonical-attributes, price-bands, image-hash, stages, events, metrics, repository, normalizer, coordinator, index) + normalizer.test.ts.
- Pipeline A2.1→A2.2→A2.3→A2.4→A2.5 completo: Signals → Planner → Plans → Orchestrator → Jobs → Workers → RawProductRecord (imutável) → Normalizer → NormalizedProductRecord (novo artefato).
- Raw Store permanece estritamente imutável (semanticHash removido).
- 183 testes totais passando no discovery module.
- Próximo: A2.6 — Similarity/Deduplication (consome NormalizedProductsCreated, usa semanticHash + phash para detectar duplicatas).
