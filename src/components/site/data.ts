/**
 * Static project data shown on the foundation landing page.
 * Single source of truth for backlog / modules / packages / ADRs / stack / domain.
 */

export type ItemStatus = "done" | "in_progress" | "pending";

export interface BacklogItem {
  id: string;
  title: string;
  status: ItemStatus;
}

export interface ModuleItem {
  name: string;
  description: string;
  backlogId: string;
  status: ItemStatus;
}

export interface PackageItem {
  name: string;
  scope: string;
  description: string;
  category: "domain" | "infrastructure" | "tooling" | "integration";
}

export interface AdrItem {
  id: string;
  title: string;
  status: "Accepted";
  date: string;
  summary: string;
}

export interface StackItem {
  concern: string;
  choice: string;
}

export interface PrincipleItem {
  name: string;
  description: string;
}

export interface SupplierItem {
  name: string;
  category: "General" | "Print-on-Demand" | "EU-focused";
}

export interface DomainContext {
  name: string;
  package: string;
  responsibility: string;
  aggregates: string[];
  status: ItemStatus;
}

export interface DomainEventItem {
  type: string;
  emitter: string;
  consumers: string[];
}

// ── Backlog (reordered: 02 = Domain Architecture, 03 = Design System) ──

export const BACKLOG: BacklogItem[] = [
  { id: "01", title: "Fundação do Projeto", status: "done" },
  { id: "02", title: "Arquitetura de Domínio", status: "done" },
  { id: "03", title: "Design System", status: "done" },
  { id: "04", title: "Banco de Dados (04A Modelo + 04B.1 Foundation)", status: "done" },
  { id: "05", title: "Autenticação", status: "pending" },
  { id: "06", title: "Catálogo de Produtos", status: "pending" },
  { id: "07", title: "Fornecedores (Dropshipping)", status: "pending" },
  { id: "08", title: "Busca", status: "pending" },
  { id: "09", title: "Carrinho", status: "pending" },
  { id: "10", title: "Checkout", status: "pending" },
  { id: "11", title: "Pagamentos", status: "pending" },
  { id: "12", title: "Pedidos", status: "pending" },
  { id: "13", title: "Área do Cliente", status: "pending" },
  { id: "14", title: "Painel Administrativo", status: "pending" },
  { id: "15", title: "Marketing", status: "pending" },
  { id: "16", title: "SEO", status: "pending" },
  { id: "17", title: "Blog", status: "pending" },
  { id: "18", title: "Analytics", status: "pending" },
  { id: "19", title: "IA", status: "pending" },
  { id: "20", title: "Internacionalização", status: "pending" },
  { id: "21", title: "Performance", status: "pending" },
  { id: "22", title: "Segurança", status: "pending" },
  { id: "23", title: "Observabilidade", status: "pending" },
  { id: "24", title: "Testes", status: "pending" },
  { id: "25", title: "Deploy", status: "pending" },
  { id: "26", title: "Escalabilidade", status: "pending" }
];

export const MODULES: ModuleItem[] = [
  {
    name: "Catalog",
    description: "Produtos, variantes, categorias, mídia, atributos.",
    backlogId: "06",
    status: "pending"
  },
  {
    name: "Suppliers",
    description: "Adapters de fornecedores com Adapter Pattern.",
    backlogId: "07",
    status: "pending"
  },
  {
    name: "Search",
    description: "Indexação Meilisearch, busca facetada, autocomplete.",
    backlogId: "08",
    status: "pending"
  },
  {
    name: "Cart",
    description: "Carrinho persistente, multi-currency, multi-locale.",
    backlogId: "09",
    status: "pending"
  },
  {
    name: "Checkout",
    description: "Fluxo de checkout otimizado, address, shipping.",
    backlogId: "10",
    status: "pending"
  },
  {
    name: "Payments",
    description: "Stripe + PayPal, webhooks, refunds, idempotência.",
    backlogId: "11",
    status: "pending"
  },
  {
    name: "Orders",
    description: "Estado do pedido, fulfillment, tracking, eventos.",
    backlogId: "12",
    status: "pending"
  },
  {
    name: "Customers",
    description: "Perfil, endereços, wishlist, histórico.",
    backlogId: "13",
    status: "pending"
  },
  {
    name: "Admin",
    description: "Dashboard administrativo, CRUD, bulk ops.",
    backlogId: "14",
    status: "pending"
  },
  {
    name: "Marketing",
    description: "Cupons, campanhas, newsletter, affiliate.",
    backlogId: "15",
    status: "pending"
  },
  {
    name: "SEO",
    description: "Schema.org, sitemap, robots, metadata API.",
    backlogId: "16",
    status: "pending"
  },
  {
    name: "CMS / Blog",
    description: "Editor MDX, taxonomias, agendamento.",
    backlogId: "17",
    status: "pending"
  },
  {
    name: "Analytics",
    description: "GA4, GSC, Clarity, Sentry, UptimeRobot.",
    backlogId: "18",
    status: "pending"
  },
  {
    name: "AI",
    description: "Geração de copy, chat, reranking, tagging.",
    backlogId: "19",
    status: "pending"
  },
  {
    name: "Internationalization",
    description: "next-intl, catálogos, currency, taxas.",
    backlogId: "20",
    status: "pending"
  }
];

export const PACKAGES: PackageItem[] = [
  // Domain
  {
    name: "domain",
    scope: "@workspace/domain",
    description:
      "8 bounded contexts: catalog, customer, cart, checkout, order, payment, supplier, shared.",
    category: "domain"
  },
  {
    name: "contracts",
    scope: "@workspace/contracts",
    description: "DTOs, event schemas (Zod), API contracts, input validation schemas.",
    category: "domain"
  },
  // Infrastructure
  {
    name: "ui",
    scope: "@workspace/ui",
    description: "Primitivas shadcn/ui e tokens do design system.",
    category: "infrastructure"
  },
  {
    name: "database",
    scope: "@workspace/database",
    description: "Cliente Prisma, schema, repositórios, migrations.",
    category: "infrastructure"
  },
  {
    name: "auth",
    scope: "@workspace/auth",
    description: "Auth.js, sessões, RBAC, adapters OAuth.",
    category: "infrastructure"
  },
  {
    name: "validation",
    scope: "@workspace/validation",
    description: "Schemas Zod por domínio (catalog, orders, ...).",
    category: "infrastructure"
  },
  {
    name: "analytics",
    scope: "@workspace/analytics",
    description: "GA4, GSC, Clarity, Sentry, UptimeRobot clients.",
    category: "infrastructure"
  },
  {
    name: "seo",
    scope: "@workspace/seo",
    description: "metadata, schema.org JSON-LD, robots, sitemap.",
    category: "infrastructure"
  },
  {
    name: "ai",
    scope: "@workspace/ai",
    description: "core, providers, prompts, embeddings, rag, evaluation, tools.",
    category: "infrastructure"
  },
  {
    name: "i18n",
    scope: "@workspace/i18n",
    description: "messages, routing, locale config (next-intl).",
    category: "infrastructure"
  },
  {
    name: "observability",
    scope: "@workspace/observability",
    description: "logger, metrics, tracing, instrumentation.",
    category: "infrastructure"
  },
  // Integration
  {
    name: "integrations",
    scope: "@workspace/integrations",
    description: "Adapters de fornecedores de dropshipping.",
    category: "integration"
  },
  // Tooling
  {
    name: "shared",
    scope: "@workspace/shared",
    description: "Utilidades cross-cutting: formatters, helpers, constantes.",
    category: "tooling"
  },
  {
    name: "types",
    scope: "@workspace/types",
    description: "Tipos TypeScript compartilhados por domínio.",
    category: "tooling"
  },
  {
    name: "config",
    scope: "@workspace/config",
    description: "tsconfig, eslint e prettier compartilhados.",
    category: "tooling"
  },
  {
    name: "testing",
    scope: "@workspace/testing",
    description: "Vitest config, utils, mocks, fixtures.",
    category: "tooling"
  }
];

export const ADRS: AdrItem[] = [
  {
    id: "0001",
    title: "Modular Monolith as initial topology",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Um único deployable com fronteiras estritas entre módulos. Permite velocidade agora e extração futura para microsserviços sem rewrite."
  },
  {
    id: "0002",
    title: "Bun workspaces + Turborepo monorepo",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Workspaces Bun para hoisting de deps, Turborepo para orquestração e cache. Packages @workspace/* com path aliases TS."
  },
  {
    id: "0003",
    title: "Sandbox-constrained layout adaptation",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Next.js permanece na raiz (dev server auto-startado pelo sandbox). packages/* é workspace real. Migração para apps/web é mecânica."
  },
  {
    id: "0004",
    title: "Decoupled AI provider layer",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Interface LLMProvider única com adapters por provider. Swap via env AI_DEFAULT_PROVIDER. Adapters: OpenAI, Anthropic, Z.ai, local."
  },
  {
    id: "0005",
    title: "Domain Architecture — Bounded Contexts & Aggregates",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "8 Bounded Contexts (catalog, customer, cart, checkout, order, payment, supplier, shared) com aggregate roots, domain events e contracts separados. DDD-inspired, event-driven, sem event sourcing (YAGNI)."
  },
  {
    id: "0006",
    title: "Domain-Driven Design System",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "UI em camadas (tokens, primitives, commerce, admin, marketing, charts) onde cada componente mapeia um conceito do domínio. ProductCard reflete ProductListItemDTO, OrderStatusBadge reflete OrderStatus."
  },
  {
    id: "0007",
    title: "Architecture Tests",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Script custom (sem deps externas) valida dependências entre camadas em CI. Domain não importa Prisma, UI não importa Database, Integrations não importa Presentation. 58 files, 0 violações."
  },
  {
    id: "0008",
    title: "In-Process Domain Event Bus",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Interface DomainEventBus + InMemoryEventBus (singleton, prefix matching, at-least-once). Upgrade path para Redis Streams/Kafka/NATS via setEventBus() sem tocar domínio."
  },
  {
    id: "0009",
    title: "Persistence Model",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "28 tabelas em 7 contextos. Convenções: soft delete, audit, optimistic lock, Money BIGINT+CHAR(3), ProductOffer (multi-supplier), Inventory separado, variants normalizados."
  },
  {
    id: "0010",
    title: "Unit of Work",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Interface UnitOfWork + RepositoryRegistry. Domain nunca conhece Prisma. transaction<T>(fn) com commit/rollback automático. AdvancedUnitOfWork com isolation levels."
  },
  {
    id: "0011",
    title: "Query / Command Separation",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Repository (writes, aggregates, transações) vs QueryService (reads, DTOs, fora de transações). CQRS leve — upgrade para read store dedicado é mecânico."
  },
  {
    id: "0012",
    title: "Multi-Store Foundation & Persistence Refinements",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "6 ajustes: Store Context (multi-tenant), User/Customer split, Price History (append-only), Inventory Reservation (anti-overselling), Integration Layer (sync jobs + secret references), Idempotency Keys. +9 tabelas, total 37."
  },
  {
    id: "0013",
    title: "Outbox Pattern & Webhook Inbox",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Outbox: critical events persistidos na mesma TX do aggregate change. Worker publica + retry exponencial. Webhook Inbox: webhooks armazenados antes do processamento. UNIQUE(provider, externalId) previne duplicatas."
  },
  {
    id: "0014",
    title: "Lookup Contexts (Currency & Country)",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "Currency (ISO 4217, 12 seed) + Country (ISO 3166-1, 20 seed) como tabelas de lookup. Foundation para tax rules, shipping rules, currency formatting, multi-currency checkout."
  },
  {
    id: "0015",
    title: "Repository Implementation Patterns",
    status: "Accepted",
    date: "2026-07-11",
    summary:
      "10 padrões: Mapper Layer (8 mappers Prisma↔Domain), BaseRepository (soft delete + optimistic lock + outbox), PrismaUnitOfWork (event collector), N+1 prevention (explicit include), Cursor pagination, CacheRepository interface (Redis-ready)."
  }
];

export const STACK: StackItem[] = [
  { concern: "Framework", choice: "Next.js 16 (App Router, Turbopack)" },
  { concern: "Language", choice: "TypeScript 5 (strict)" },
  { concern: "Styling", choice: "Tailwind CSS v4" },
  { concern: "UI library", choice: "shadcn/ui (New York) + Lucide" },
  { concern: "ORM", choice: "Prisma · SQLite dev → Supabase prod" },
  { concern: "Auth", choice: "Auth.js (NextAuth v4)" },
  { concern: "Cache", choice: "Upstash Redis (serverless)" },
  { concern: "Search", choice: "Meilisearch" },
  { concern: "Storage", choice: "Cloudinary" },
  { concern: "i18n", choice: "next-intl" },
  { concern: "State (client)", choice: "Zustand" },
  { concern: "State (server)", choice: "TanStack Query" },
  { concern: "Forms", choice: "react-hook-form + Zod" },
  { concern: "Domain", choice: "DDD-inspired · 8 Bounded Contexts · domain events" },
  { concern: "AI", choice: "Camada desacoplada (providers intercambiáveis)" },
  { concern: "Observability", choice: "Logger estruturado + GA4 · GSC · Clarity · Sentry" },
  { concern: "Deploy", choice: "Vercel + Cloudflare" },
  { concern: "CI", choice: "GitHub Actions + Dependabot" },
  { concern: "Monorepo", choice: "Bun workspaces + Turborepo" }
];

export const PRINCIPLES: PrincipleItem[] = [
  { name: "Clean Architecture", description: "Camadas com dependências apontando para dentro." },
  { name: "DDD", description: "Bounded Contexts, aggregates, ubiquitous language." },
  { name: "SOLID", description: "Princípios de design orientado a objetos." },
  { name: "KISS", description: "Simplicidade acima de cleverness." },
  { name: "DRY", description: "Don't Repeat Yourself — dentro do bom senso." },
  { name: "YAGNI", description: "You Aren't Gonna Need It — não antecipe." },
  { name: "API First", description: "Contrato antes de implementação." },
  { name: "Mobile First", description: "Design mobile, enhancement para desktop." },
  { name: "Progressive Enhancement", description: "Funciona sem JS, melhor com JS." }
];

export const SUPPLIERS: SupplierItem[] = [
  { name: "AliExpress", category: "General" },
  { name: "CJ Dropshipping", category: "General" },
  { name: "DSers", category: "General" },
  { name: "Zendrop", category: "General" },
  { name: "Spocket", category: "General" },
  { name: "Syncee", category: "General" },
  { name: "Modalyst", category: "General" },
  { name: "BigBuy", category: "EU-focused" },
  { name: "Printful", category: "Print-on-Demand" },
  { name: "Printify", category: "Print-on-Demand" },
  { name: "Gelato", category: "Print-on-Demand" }
];

export const DOMAIN_CONTEXTS: DomainContext[] = [
  {
    name: "Shared",
    package: "@workspace/domain/shared",
    responsibility: "Base primitives: EntityId, Money, Address, Email, DomainEvent, Result<T,E>.",
    aggregates: [],
    status: "done"
  },
  {
    name: "Catalog",
    package: "@workspace/domain/catalog",
    responsibility: "Product definition, variants, categories, attributes, media.",
    aggregates: ["Product", "Category"],
    status: "done"
  },
  {
    name: "Customer",
    package: "@workspace/domain/customer",
    responsibility: "Customer identity, profile, addresses, wishlist.",
    aggregates: ["Customer"],
    status: "done"
  },
  {
    name: "Cart",
    package: "@workspace/domain/cart",
    responsibility: "Shopping cart lifecycle — items, quantities, totals.",
    aggregates: ["Cart"],
    status: "done"
  },
  {
    name: "Checkout",
    package: "@workspace/domain/checkout",
    responsibility: "Order-placement flow — addresses, shipping, payment intent.",
    aggregates: ["CheckoutSession"],
    status: "done"
  },
  {
    name: "Orders",
    package: "@workspace/domain/order",
    responsibility: "Placed orders, line items, fulfillment, tracking.",
    aggregates: ["Order"],
    status: "done"
  },
  {
    name: "Payments",
    package: "@workspace/domain/payment",
    responsibility: "Payment intents, transactions, captures, refunds.",
    aggregates: ["Payment"],
    status: "done"
  },
  {
    name: "Suppliers",
    package: "@workspace/domain/supplier",
    responsibility: "Supplier identity, product mapping, fulfillment orders.",
    aggregates: ["Supplier", "SupplierOrder"],
    status: "done"
  }
];

export const DOMAIN_EVENTS: DomainEventItem[] = [
  { type: "catalog.product.created", emitter: "Catalog", consumers: ["Search", "Analytics"] },
  { type: "catalog.product.published", emitter: "Catalog", consumers: ["Search", "SEO"] },
  { type: "catalog.product.price_changed", emitter: "Catalog", consumers: ["Search", "Marketing"] },
  { type: "customer.registered", emitter: "Customer", consumers: ["Marketing", "Analytics"] },
  { type: "cart.abandoned", emitter: "Cart", consumers: ["Marketing"] },
  { type: "checkout.completed", emitter: "Checkout", consumers: ["Orders", "Analytics"] },
  { type: "order.placed", emitter: "Orders", consumers: ["Payments", "Suppliers"] },
  { type: "order.paid", emitter: "Orders", consumers: ["Notifications"] },
  { type: "order.shipped", emitter: "Orders", consumers: ["Notifications"] },
  { type: "payment.captured", emitter: "Payments", consumers: ["Orders"] },
  { type: "payment.failed", emitter: "Payments", consumers: ["Orders", "Notifications"] },
  { type: "supplier.order.shipped", emitter: "Suppliers", consumers: ["Orders"] }
];

export const PROJECT_META = {
  name: "ShopFinder",
  tagline: "compra inteligente",
  version: "0.6.0",
  iteration: "Catalog Intelligence Platform — validação em camadas, 7 fornecedores",
  summary:
    "ShopFinder é uma plataforma de Catalog Intelligence baseada em IA que transforma dados heterogêneos de produtos em um catálogo canônico, enriquecido, validado e pronto para distribuição em múltiplos canais."
};

export interface DesignSystemLayer {
  name: string;
  description: string;
  components: string[];
  color: string;
}

export const DESIGN_SYSTEM: DesignSystemLayer[] = [
  {
    name: "tokens",
    description:
      "Design tokens — color, typography, spacing, radius, shadow, z-index, motion, breakpoints, commerce-specific.",
    components: [
      "colorTokens",
      "fontTokens",
      "spacingTokens",
      "radiusTokens",
      "shadowTokens",
      "zIndexTokens",
      "motionTokens",
      "commerceTokens"
    ],
    color: "text-violet-600 dark:text-violet-400"
  },
  {
    name: "primitives",
    description: "Re-export de shadcn/ui (New York) para indireção de swap futuro.",
    components: [
      "Button",
      "Card",
      "Badge",
      "Input",
      "Label",
      "Separator",
      "Avatar",
      "AspectRatio",
      "ScrollArea",
      "Table",
      "Tabs",
      "Accordion",
      "Dialog",
      "Sheet",
      "DropdownMenu",
      "Select",
      "Tooltip",
      "Skeleton",
      "Progress",
      "Toast"
    ],
    color: "text-sky-600 dark:text-sky-400"
  },
  {
    name: "commerce",
    description: "Componentes que refletem o domínio de e-commerce (Product, Variant, Cart, ...).",
    components: [
      "ProductCard",
      "Price",
      "Money",
      "StockBadge",
      "Rating",
      "AddToCartButton",
      "QuantitySelector",
      "VariantSelector",
      "ProductGallery",
      "ProductCarousel"
    ],
    color: "text-emerald-600 dark:text-emerald-400"
  },
  {
    name: "admin",
    description: "Componentes para painel administrativo (Order, Customer, KPIs).",
    components: [
      "OrderStatusBadge",
      "KPIWidget",
      "DataTable",
      "FilterPanel",
      "CustomerAvatar",
      "ActivityTimeline"
    ],
    color: "text-amber-600 dark:text-amber-400"
  },
  {
    name: "marketing",
    description: "Componentes para landing pages e campanhas promocionais.",
    components: ["Hero", "Banner", "Countdown", "Testimonial", "Newsletter", "CTA", "TrustBadge"],
    color: "text-rose-600 dark:text-rose-400"
  },
  {
    name: "charts",
    description: "Wrappers Recharts domain-aware (Revenue, Orders, Status distribution).",
    components: ["RevenueChart", "OrdersBarChart", "StatusDonut"],
    color: "text-cyan-600 dark:text-cyan-400"
  }
];

export interface DomainEnhancement {
  name: string;
  description: string;
  status: ItemStatus;
}

export const DOMAIN_ENHANCEMENTS: DomainEnhancement[] = [
  {
    name: "Branded IDs",
    description:
      "ProductId, OrderId, CustomerId, ... — type-safe IDs que previnem bugs em compile time.",
    status: "done"
  },
  {
    name: "Repository Contracts",
    description:
      "Interfaces ProductRepository, OrderRepository, CartRepository, CustomerRepository, SupplierRepository.",
    status: "done"
  },
  {
    name: "Domain Services",
    description:
      "Interfaces PricingService, ShippingService, TaxService, CurrencyService, RecommendationService.",
    status: "done"
  },
  {
    name: "Specifications",
    description:
      "CanCheckout, ProductAvailable, SupplierSupportsCountry, CanCompleteCheckout + combinators AND/OR/NOT.",
    status: "done"
  },
  {
    name: "Event Bus",
    description:
      "DomainEventBus interface + InMemoryEventBus. Upgrade path para Redis Streams/Kafka/NATS sem tocar domínio.",
    status: "done"
  },
  {
    name: "Architecture Tests",
    description:
      "Scripts que validam dependências entre camadas (domain não importa Prisma, UI não importa Database, ...). 58 files, 0 violações.",
    status: "done"
  }
];

// ── Persistence Model (04A) ─────────────────────────────────

export interface PersistenceTable {
  name: string;
  context: string;
  description: string;
  keyColumns: string[];
}

export const PERSISTENCE_TABLES: PersistenceTable[] = [
  {
    name: "categories",
    context: "Catalog",
    description: "Hierarchical product categories (self-referential parent_id).",
    keyColumns: ["id", "slug", "name", "parent_id"]
  },
  {
    name: "products",
    context: "Catalog",
    description: "Product definitions with base price, status, category.",
    keyColumns: ["id", "sku", "slug", "base_price_minor_units", "version"]
  },
  {
    name: "variants",
    context: "Catalog",
    description: "Product variants (size, color). Separate from Product per Rec 8.",
    keyColumns: ["id", "product_id", "sku", "price_minor_units", "version"]
  },
  {
    name: "variant_options",
    context: "Catalog",
    description: "Attribute names per product (e.g. 'Color', 'Size').",
    keyColumns: ["id", "product_id", "name"]
  },
  {
    name: "variant_values",
    context: "Catalog",
    description: "Attribute values (e.g. 'Red', 'XL').",
    keyColumns: ["id", "option_id", "value"]
  },
  {
    name: "variant_attribute_values",
    context: "Catalog",
    description: "Join: variant ↔ value (normalized attributes).",
    keyColumns: ["variant_id", "value_id"]
  },
  {
    name: "product_media",
    context: "Catalog",
    description: "Product images (1:N, separate per Rec 7).",
    keyColumns: ["id", "product_id", "url", "is_primary"]
  },
  {
    name: "product_attributes",
    context: "Catalog",
    description: "Free-form product attributes (key-value).",
    keyColumns: ["id", "product_id", "name", "value"]
  },
  {
    name: "inventory",
    context: "Catalog",
    description: "Stock per variant per offer (separate per Rec 9). available/reserved/committed.",
    keyColumns: [
      "id",
      "variant_id",
      "product_offer_id",
      "available",
      "reserved",
      "committed",
      "version"
    ]
  },
  {
    name: "customers",
    context: "Customer",
    description: "Customer identity, email, locale, status.",
    keyColumns: ["id", "email", "name", "status", "version"]
  },
  {
    name: "customer_addresses",
    context: "Customer",
    description: "Shipping/billing addresses (1:N).",
    keyColumns: ["id", "customer_id", "country", "is_default"]
  },
  {
    name: "wishlist_items",
    context: "Customer",
    description: "Wishlist entries.",
    keyColumns: ["id", "customer_id", "product_id"]
  },
  {
    name: "carts",
    context: "Cart",
    description: "Shopping carts (customer or session-scoped).",
    keyColumns: ["id", "customer_id", "session_id", "currency", "version"]
  },
  {
    name: "cart_items",
    context: "Cart",
    description: "Cart line items with price snapshot.",
    keyColumns: ["id", "cart_id", "product_id", "quantity"]
  },
  {
    name: "checkout_sessions",
    context: "Checkout",
    description: "Transient checkout flow (addresses + method as JSONB).",
    keyColumns: ["id", "cart_id", "status", "version"]
  },
  {
    name: "orders",
    context: "Order",
    description: "Placed orders with totals, addresses, lifecycle timestamps.",
    keyColumns: ["id", "number", "customer_id", "grand_total_minor_units", "status", "version"]
  },
  {
    name: "order_items",
    context: "Order",
    description: "Order line items (snapshot of product + price).",
    keyColumns: ["id", "order_id", "sku", "quantity", "line_total_minor_units"]
  },
  {
    name: "order_fulfillments",
    context: "Order",
    description: "Fulfillment per supplier (tracking, status).",
    keyColumns: ["id", "order_id", "supplier_id", "tracking_number"]
  },
  {
    name: "payments",
    context: "Payment",
    description: "Payment intents with method + status.",
    keyColumns: ["id", "order_id", "amount_minor_units", "status", "version"]
  },
  {
    name: "payment_transactions",
    context: "Payment",
    description: "Provider transactions (auth, capture, void).",
    keyColumns: ["id", "payment_id", "provider_tx_id", "type", "status"]
  },
  {
    name: "payment_refunds",
    context: "Payment",
    description: "Refund records.",
    keyColumns: ["id", "payment_id", "amount_minor_units", "status"]
  },
  {
    name: "suppliers",
    context: "Supplier",
    description: "Dropshipping suppliers (AliExpress, CJ, ...).",
    keyColumns: ["id", "code", "name", "default_currency", "version"]
  },
  {
    name: "supplier_integrations",
    context: "Supplier",
    description: "API credentials + sync status per supplier.",
    keyColumns: ["id", "supplier_id", "code", "status"]
  },
  {
    name: "product_offers",
    context: "Supplier",
    description:
      "Supplier offers per product/variant (Rec 10 — multi-supplier differentiator). price, inventory, fulfillment.",
    keyColumns: [
      "id",
      "supplier_id",
      "product_id",
      "variant_id",
      "price_minor_units",
      "inventory",
      "ships_from_country",
      "version"
    ]
  },
  {
    name: "supplier_orders",
    context: "Supplier",
    description: "Orders placed with suppliers for fulfillment.",
    keyColumns: ["id", "supplier_id", "order_id", "total_cost_minor_units", "status", "version"]
  },
  {
    name: "supplier_order_items",
    context: "Supplier",
    description: "Line items within a supplier order.",
    keyColumns: ["id", "supplier_order_id", "product_id", "quantity", "cost_minor_units"]
  },
  {
    name: "product_offer_price_history",
    context: "Supplier",
    description:
      "Append-only price change log per ProductOffer (Ajuste 3). Margin analysis, alerts, AI pricing.",
    keyColumns: ["id", "offer_id", "price_minor_units", "changed_at", "change_source"]
  },
  // Store
  {
    name: "stores",
    context: "Store",
    description: "Multi-tenant foundation (Ajuste 1). White-label, multi-brand, multi-domain.",
    keyColumns: ["id", "slug", "default_currency", "default_locale", "domain", "version"]
  },
  // Identity
  {
    name: "users",
    context: "Identity",
    description:
      "Auth identity (Ajuste 2). Separated from Customer. Roles: customer/admin/supplier/support.",
    keyColumns: ["id", "email", "password_hash", "roles", "store_id", "customer_id", "version"]
  },
  {
    name: "user_roles",
    context: "Identity",
    description: "User roles (if not using Postgres array). Composite PK (user_id, role).",
    keyColumns: ["user_id", "role"]
  },
  // Integration
  {
    name: "integrations",
    context: "Integration",
    description: "External system config (Ajuste 5). Supplier APIs, payment providers, etc.",
    keyColumns: ["id", "type", "provider_code", "supplier_id", "status", "config", "version"]
  },
  {
    name: "supplier_credentials",
    context: "Integration",
    description:
      "Secret REFERENCES only (Ajuste 5). Never the secret value — env var name or vault path.",
    keyColumns: ["id", "integration_id", "key_name", "secret_reference"]
  },
  {
    name: "sync_jobs",
    context: "Integration",
    description: "Scheduled or triggered syncs (Ajuste 5). Cron + timezone + trigger type.",
    keyColumns: ["id", "integration_id", "schedule_cron", "trigger", "next_run_at", "version"]
  },
  {
    name: "sync_execution_logs",
    context: "Integration",
    description:
      "Per-run sync logs (Ajuste 5). Status, duration, items processed/succeeded/failed.",
    keyColumns: ["id", "sync_job_id", "status", "started_at", "items_processed"]
  },
  // Cross-cutting
  {
    name: "inventory_reservations",
    context: "Cross-cutting",
    description:
      "Stock reservations during checkout (Ajuste 4). Prevents overselling. TTL-based expiry.",
    keyColumns: ["id", "inventory_id", "variant_id", "quantity", "status", "expires_at"]
  },
  {
    name: "idempotency_keys",
    context: "Cross-cutting",
    description:
      "Idempotency for webhooks/payments (Ajuste 6). Key + request hash + cached response.",
    keyColumns: ["key", "scope", "request_hash", "response_hash", "expires_at"]
  },
  {
    name: "outbox_events",
    context: "Cross-cutting",
    description:
      "Outbox Pattern (Ajuste 1 of 04B.1). Critical events persisted in same TX as aggregate change. Worker publishes + retries with exponential backoff.",
    keyColumns: [
      "id",
      "aggregate_type",
      "aggregate_id",
      "event_type",
      "status",
      "attempts",
      "available_at",
      "processed_at"
    ]
  },
  {
    name: "webhook_events",
    context: "Cross-cutting",
    description:
      "Webhook Inbox (Ajuste 2 of 04B.1). Incoming webhooks stored before processing. UNIQUE(provider, external_id) prevents duplicates.",
    keyColumns: [
      "id",
      "provider",
      "external_id",
      "event_type",
      "status",
      "attempts",
      "received_at",
      "processed_at"
    ]
  },
  // Lookup
  {
    name: "currencies",
    context: "Lookup",
    description:
      "ISO 4217 currencies (Ajuste 4 of 04B.1). code PK, decimalPlaces, symbol, active. 12 seeded.",
    keyColumns: ["code", "name", "symbol", "decimal_places", "active"]
  },
  {
    name: "countries",
    context: "Lookup",
    description:
      "ISO 3166-1 countries (Ajuste 5 of 04B.1). code PK, region, active. 20 seeded. Foundation for tax + shipping rules.",
    keyColumns: ["code", "name", "region", "active"]
  }
];

export interface PersistenceConvention {
  name: string;
  description: string;
  example: string;
}

export const PERSISTENCE_CONVENTIONS: PersistenceConvention[] = [
  {
    name: "Soft Delete",
    description:
      "Every table has deleted_at. Queries default to WHERE deleted_at IS NULL. Hard delete forbidden in app code.",
    example: "deleted_at TIMESTAMPTZ NULL"
  },
  {
    name: "Audit Fields",
    description: "createdAt, updatedAt, createdBy, updatedBy on every table.",
    example: "created_by VARCHAR(30) NULL"
  },
  {
    name: "Optimistic Lock",
    description:
      "Versioned aggregates carry version INTEGER. UPDATE checks WHERE version = ?; 0 rows → OptimisticLockError.",
    example: "version INTEGER NOT NULL DEFAULT 1"
  },
  {
    name: "Money (BIGINT)",
    description:
      "Never DECIMAL. amount_in_minor_units BIGINT + currency CHAR(3). Supports 0-decimal currencies (JPY) and large amounts.",
    example: "amount_in_minor_units BIGINT, currency CHAR(3)"
  },
  {
    name: "cuid IDs",
    description: "All PKs are cuid (VARCHAR(30)). Branded in domain (ProductId, OrderId, ...).",
    example: "id VARCHAR(30) PRIMARY KEY"
  },
  {
    name: "TIMESTAMPTZ",
    description:
      "All timestamps with time zone, stored in UTC. Locale conversion at presentation layer.",
    example: "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
  },
  {
    name: "ProductOffer (Rec 10)",
    description:
      "Never Product → Supplier. Product → ProductOffer ← Supplier. One product, 12 suppliers, 12 offers.",
    example: "product_offers(supplier_id, product_id, price, inventory, ...)"
  },
  {
    name: "Inventory separated (Rec 9)",
    description:
      "Inventory is its own table (not a column on variants). Supports multiple suppliers per variant + available/reserved/committed states.",
    example: "inventory(variant_id, product_offer_id, available, reserved, committed)"
  },
  {
    name: "Variants normalized (Rec 8)",
    description:
      "variant_options + variant_values + variant_attribute_values (join). Enables faceted search, avoids duplicate strings.",
    example: "variant_options(product_id, name), variant_values(option_id, value)"
  },
  {
    name: "Product images 1:N (Rec 7)",
    description: "Product media in separate table (not embedded in Product).",
    example: "product_media(product_id, url, is_primary, position)"
  },
  {
    name: "Multi-Store (Ajuste 1)",
    description:
      "Store aggregate + store_id FK on tenant-scoped tables. White-label/multi-brand ready.",
    example: "stores(id, slug, default_currency), products.store_id FK"
  },
  {
    name: "User/Customer split (Ajuste 2)",
    description:
      "User = auth identity (email, passwordHash, roles). Customer = commerce profile. Linked via user.customerId.",
    example: "users(email, password_hash, roles), customers(user_id FK)"
  },
  {
    name: "Price History append-only (Ajuste 3)",
    description:
      "product_offer_price_history nunca é UPDATE/DELETE. Margin analysis, alerts, AI pricing.",
    example: "product_offer_price_history(offer_id, price, changed_at) — append only"
  },
  {
    name: "Inventory Reservation (Ajuste 4)",
    description:
      "inventory_reservations com TTL. Previne overselling durante checkout. Sweeper job marca expirados.",
    example: "inventory_reservations(inventory_id, quantity, expires_at, status)"
  },
  {
    name: "Secret References (Ajuste 5)",
    description:
      "supplier_credentials guarda apenas secretReference (env var / vault path), nunca o valor do segredo.",
    example: "supplier_credentials(secret_reference = 'ALIEXPRESS_API_KEY')"
  },
  {
    name: "Idempotency Keys (Ajuste 6)",
    description:
      "idempotency_keys com key + request_hash + cached response. Webhooks e pagamentos safe-to-retry.",
    example: "idempotency_keys(key PK, scope, request_hash, response_body JSONB)"
  }
];

export interface PersistenceLayer {
  name: string;
  description: string;
  interfaces: string[];
  returnsAggregate: boolean;
}

export const PERSISTENCE_LAYERS: PersistenceLayer[] = [
  {
    name: "Repository (Commands)",
    description:
      "Write-side. Reconstitutes full aggregates. Runs inside UnitOfWork transaction. 12 interfaces.",
    interfaces: [
      "ProductRepository",
      "CategoryRepository",
      "VariantRepository",
      "InventoryRepository",
      "CustomerRepository",
      "CartRepository",
      "CheckoutSessionRepository",
      "OrderRepository",
      "PaymentRepository",
      "SupplierRepository",
      "SupplierOrderRepository",
      "ProductOfferRepository"
    ],
    returnsAggregate: true
  },
  {
    name: "QueryService (Reads)",
    description:
      "Read-side. Returns DTOs (not aggregates). Outside transactions. Can hit replica/index/cache. 6 interfaces.",
    interfaces: [
      "ProductQueryService",
      "CategoryQueryService",
      "CustomerQueryService",
      "CartQueryService",
      "OrderQueryService",
      "SupplierQueryService"
    ],
    returnsAggregate: false
  },
  {
    name: "UnitOfWork",
    description:
      "Transaction abstraction. Domain never knows Prisma. RepositoryRegistry provides transaction-scoped repositories.",
    interfaces: ["UnitOfWork", "RepositoryRegistry", "AdvancedUnitOfWork"],
    returnsAggregate: false
  }
];
