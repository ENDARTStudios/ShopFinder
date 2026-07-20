# Directory Guide — ShopFinder

> Know where to look before you search.

## Root structure

```
/home/z/my-project/
├── .ai/                    # AI engineering directives (read first)
├── .changeset/             # Changeset configuration
├── .github/                # CI/CD workflows
├── .husky/                 # Git hooks (pre-commit, commit-msg)
├── db/                     # SQLite database file (dev)
│   └── custom.db
├── docs/                   # Documentation (brand-grid, brand-system)
├── download/               # Final deliverables (user-facing)
├── packages/               # Turborepo workspace packages
├── prisma/                 # Prisma schema (SQLite/PostgreSQL)
│   └── schema.prisma
├── public/                 # Static assets (icons, favicon, manifest)
├── scripts/                # Generation + architecture scripts
├── src/                    # Next.js application
├── tool-results/           # Intermediate tool outputs (temporary)
├── upload/                 # User uploads
├── worklog.md              # Shared multi-agent work log (append-only)
├── package.json            # Root package (workspace config)
├── tsconfig.json           # Root TypeScript config
├── next.config.ts          # Next.js configuration
├── docker-compose.yml      # Production infrastructure
└── .env                    # Environment variables
```

## packages/ (domain + infrastructure)

```
packages/
├── domain/                         # Domain model (ZERO infra imports)
│   └── src/
│       ├── discovery/              # 15-stage pipeline
│       │   ├── planner.ts          # A2.1 Discovery Planner
│       │   ├── orchestrator/       # A2.2 Orchestrator
│       │   ├── workers/            # A2.3 Workers
│       │   ├── raw-store/          # A2.4 Raw Store (append-only)
│       │   ├── normalizer/         # A2.5 Normalizer (7 stages)
│       │   ├── similarity/         # A2.6 Similarity & Duplicate Detection
│       │   ├── resolution/         # A2.7 Duplicate Resolution
│       │   ├── enrichment/         # A2.7b Manufacturer Enrichment + Knowledge Graph
│       │   │   ├── types.ts        # All type contracts + legacy compat
│       │   │   ├── registry.ts     # MANUFACTURERS, CONNECTORS, ONTOLOGY, KNOWLEDGE_GRAPH
│       │   │   ├── ontology.ts     # 45 AttributeDefinitions (canonical IDs)
│       │   │   ├── knowledge-graph.ts  # KnowledgeNode + KnowledgeEdge
│       │   │   └── index.ts        # Barrel exports
│       │   ├── evaluation/         # A2.8 AI Evaluation
│       │   ├── compliance/         # A2.9 Compliance PostCheck
│       │   ├── catalog/            # A2.10 Catalog Materializer + Publisher
│       │   ├── search/             # A2.11 Search Index
│       │   ├── marketplace-publication/ # A2.12 Marketplace Publication
│       │   ├── pricing/            # A2.13 Pricing Execution
│       │   ├── ranking/            # A2.14 Ranking
│       │   ├── monitoring/         # A2.15 Monitoring
│       │   ├── traceability.ts     # ArtifactMetadata + TraceContext
│       │   └── types.ts            # Pipeline-level types
│       ├── shared/                 # BrandedId, DomainEvent, EventBus, Money
│       ├── catalog/                # Product entity
│       ├── cart/                   # Cart entity
│       ├── checkout/               # Checkout entity
│       ├── order/                  # Order entity
│       ├── payment/                # Payment entity
│       ├── customer/               # Customer entity
│       └── supplier/               # Supplier entity
│
├── database/                       # Prisma repositories (implements domain interfaces)
│   └── src/
│       ├── client.ts               # PrismaClient singleton
│       ├── repositories/           # ProductRepository, CategoryRepository, etc.
│       ├── mappers/                # Prisma ↔ Domain mappers
│       ├── base/                   # BaseRepository (soft delete + optimistic lock)
│       ├── unit-of-work/           # PrismaUnitOfWork + EventCollector
│       └── cache/                  # CacheRepository interface (Redis-ready)
│
├── contracts/                      # API DTOs, JSON schemas
├── shared/                         # Base primitives (no @workspace/* imports)
├── ui/                             # shadcn/ui components
├── config/                         # ESLint, Prettier, TS configs
├── testing/                        # Test utilities and mocks
├── observability/                  # OpenTelemetry (tracer, metrics, logger)
├── ai/                             # AI providers (OpenAI, embeddings, RAG)
├── auth/                           # Authentication (NextAuth)
├── analytics/                      # Analytics
├── i18n/                           # Internationalization
├── seo/                            # SEO (metadata, sitemap, robots)
├── events/                         # Event bus implementation
├── jobs/                           # Background jobs
├── providers/                      # External provider integrations
├── application/                    # Application layer (command/query handlers)
├── bootstrap/                      # Composition root
├── api/                            # API utilities (request context, middleware)
├── validation/                     # Validation schemas (zod)
├── integrations/                   # Third-party integrations
└── types/                          # Shared types
```

## src/ (Next.js app)

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (metadata, footer, ThemeProvider)
│   ├── page.tsx                    # Landing page (renders <Landing />)
│   ├── globals.css                 # Global styles
│   ├── favicon.ico                 # Static favicon (auto-detected by Next.js)
│   ├── icon.tsx                    # Dynamic favicon (edge-rendered PNG 32×32)
│   ├── apple-icon.tsx              # Dynamic Apple Touch Icon (edge-rendered 180×180)
│   ├── opengraph-image.tsx         # Dynamic OG image (edge-rendered 1200×630)
│   ├── twitter-image.tsx           # Dynamic Twitter Card (edge-rendered 1200×600)
│   └── api/
│       ├── route.ts                # Health check
│       └── catalog/
│           └── route.ts            # Catalog API (products, categories, niches, manufacturers)
│
├── components/
│   ├── site/
│   │   ├── landing.tsx             # Landing page (hero, niches, categories, manufacturers, products)
│   │   ├── site-footer.tsx         # Global footer
│   │   ├── data.ts                 # PROJECT_META (name, tagline, version)
│   │   ├── products.ts             # Mock product data (FEATURED_PRODUCTS, CATEGORIES)
│   │   ├── theme-provider.tsx      # Dark/light theme
│   │   └── mode-toggle.tsx         # Theme toggle button
│   └── ui/                         # shadcn/ui primitives (button, card, input, etc.)
│
├── lib/
│   ├── utils.ts                    # cn() utility (clsx + tailwind-merge)
│   └── db.ts                       # Database helpers
│
└── hooks/
    ├── use-toast.ts                # Toast notifications
    └── use-mobile.ts               # Mobile detection
```

## scripts/

```
scripts/
├── architecture-test.mjs           # Architecture dependency rules (0 violations)
├── seed-catalog.ts                 # Seed SQLite with 22 products, 67 offers, 16 categories
├── generate-icons.py               # Regenerate PNG icons from public/icon.svg
└── fix-db-imports.sh               # Database import fixer
```

## public/

```
public/
├── icon.svg                        # Brand mark (source of truth — magnifying glass)
├── logo-full.svg                   # Full logo (mark + wordmark)
├── favicon.ico                     # Legacy ICO favicon
├── favicon-16.png                  # 16×16 PNG favicon
├── favicon-32.png                  # 32×32 PNG favicon
├── apple-touch-icon.png            # 180×180 Apple icon
├── icon-192.png                    # PWA 192×192
├── icon-512.png                    # PWA 512×512
├── icon-maskable-192.png           # PWA maskable 192×192
├── icon-maskable-512.png           # PWA maskable 512×512
├── manifest.webmanifest            # PWA manifest
├── robots.txt                      # Search engine rules
└── security.txt                    # Security contact
```
