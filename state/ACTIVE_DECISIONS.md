# Active Decisions — ShopFinder

> Decisions currently in effect. The AI MUST consult this before proposing alternatives.
> If a decision is listed here as ✓, it is settled. Do not re-discuss.

## Runtime & infrastructure

| Decision | Choice | Status |
|---|---|---|
| Runtime | Bun 1.3.x | ✓ Settled |
| Package manager | Bun (bun.lock) | ✓ Settled |
| Database (dev) | SQLite via Prisma | ✓ Settled |
| Database (prod) | PostgreSQL 17 via Prisma | ✓ Settled |
| Connection pool (prod) | PgBouncer | ✓ Settled |
| Object storage | MinIO (S3-compatible) | ✓ Settled |
| Queue | BullMQ + Redis | ✓ Settled |
| Observability | OpenTelemetry (tracer, metrics, logger) | ✓ Settled |
| Containerization | Docker Compose | ✓ Settled |
| Reverse proxy | Caddy | ✓ Settled |

## Frontend

| Decision | Choice | Status |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | ✓ Settled |
| Language | TypeScript 5.x (strict) | ✓ Settled |
| CSS | Tailwind CSS 4.x | ✓ Settled |
| Components | shadcn/ui | ✓ Settled |
| Icons | lucide-react | ✓ Settled |
| Image generation | next/og (ImageResponse, Satori) | ✓ Settled |
| PWA | manifest.webmanifest + dynamic icons | ✓ Settled |

## Backend

| Decision | Choice | Status |
|---|---|---|
| ORM | Prisma 6.x | ✓ Settled |
| API style | REST (Next.js Route Handlers) | ✓ Settled |
| Monorepo | Turborepo workspaces (packages/*) | ✓ Settled |
| Architecture | Modular monolith (15-stage pipeline) | ✓ Settled |
| Event-driven | DomainEventBus (in-process) | ✓ Settled |
| Artifacts | Immutable, versioned, append-only | ✓ Settled |

## Domain

| Decision | Choice | Status |
|---|---|---|
| Catalog model | Product Knowledge Graph (catalog = projection) | ✓ Settled |
| AI role | Advisory only; PolicyEngine is authoritative | ✓ Settled |
| Authority model | AuthorityPolicy (dynamic, per-attribute) | ✓ Settled |
| Confidence model | Multi-dimensional (5 axes: manufacturer, consensus, freshness, parser, ai) | ✓ Settled |
| Manufacturer model | Rich entity (authority, coverage, capabilities, certifications, brands) | ✓ Settled |
| Connector model | Definition + Instance separated | ✓ Settled |
| Ontology | 45 canonical AttributeDefinitions | ✓ Settled |
| Provenance | AttributeEvidence[] per ProductAttribute | ✓ Settled |

## Branding

| Decision | Choice | Status |
|---|---|---|
| Name | ShopFinder | ✓ Settled |
| Slogan | compra inteligente (lowercase) | ✓ Settled |
| Logo | Magnifying glass (emerald on slate-900) | ✓ Settled |
| Footer | ShopFinder - compra inteligente - V0.6.0 / Copyright © 2026 END ART | ✓ Settled |
| Version | 0.6.0 | ✓ Settled |

## Languages

| Decision | Choice | Status |
|---|---|---|
| Primary UI | pt-BR | ✓ Settled |
| Secondary | en | ✓ Settled |
