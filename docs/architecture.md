# Architecture

> Snapshot of the current architecture. Evolves with the codebase.
> For **why** specific decisions were made, see [`adr/`](./adr/).

## 1. High-Level Shape

```
┌──────────────────────────────────────────────────────────┐
│                       apps/web (Next.js)                  │
│  Presentation · Server Components · Route Handlers        │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│              Application Services (per module)            │
│  Catalog · Orders · Cart · Checkout · Customers · ...     │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│                       Domain                              │
│  Entities · Value Objects · Domain Events                 │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│                    Repositories                           │
│  Prisma-backed · supplier adapters · external services    │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│              Infra: DB · Cache · Search · Storage         │
└──────────────────────────────────────────────────────────┘
```

## 2. Modular Monolith

The codebase is structured as a **single deployable** with **strict module boundaries**. Each module (Catalog, Orders, Cart, Checkout, ...) owns:

- its domain types,
- its service layer,
- its repository,
- its HTTP surface (Route Handlers under `src/app/api/<module>/...`),
- its UI (where applicable).

Modules communicate **only** through explicit service interfaces or domain events. Cross-module direct DB access is forbidden. When a module proves to need independent scaling, it can be extracted into a microservice without rewriting its public API.

## 3. Layering Rules

| Layer               | Allowed to depend on                  | Cannot depend on               |
| ------------------- | ------------------------------------- | ------------------------------ |
| Presentation        | Application Services                  | Domain · Repositories · DB     |
| Application Service | Domain · Repositories · Cross-cutting | Other Application Services     |
| Domain              | (nothing — pure)                      | Repositories · DB · Frameworks |
| Repository          | DB · External services                | Presentation · Domain          |

## 4. Workspace Layout

```
.
├── src/                          ← apps/web (Next.js)
│   ├── app/                      ← App Router
│   ├── components/ui/            ← shadcn/ui primitives
│   ├── lib/                      ← runtime singletons (db, auth, ...)
│   ├── modules/                  ← business modules (added incrementally)
│   └── hooks/
├── packages/
│   ├── ui/                       ← design-system primitives (re-export layer)
│   ├── shared/                   ← cross-cutting utils
│   ├── types/                    ← shared TS types
│   ├── config/                   ← tsconfig / eslint / prettier presets
│   ├── database/                 ← Prisma client & repositories
│   ├── auth/                     ← Auth.js config & adapters
│   ├── validation/               ← Zod schemas per domain
│   ├── analytics/                ← GA4 / GSC / Clarity / Sentry / UptimeRobot
│   ├── seo/                      ← JSON-LD, sitemap, robots, metadata helpers
│   ├── ai/                       ← decoupled AI provider layer
│   └── integrations/             ← dropshipping supplier adapters
├── docs/                         ← this directory
├── scripts/                      ← operational scripts (scaffold, seed, ...)
├── .github/workflows/            ← CI
├── prisma/                       ← Prisma schema & migrations
└── turbo.json                    ← Turborepo pipelines
```

## 5. Tech Stack Summary

| Concern         | Choice                                       |
| --------------- | -------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack)           |
| Language        | TypeScript 5 (strict)                        |
| Styling         | Tailwind CSS v4                              |
| UI library      | shadcn/ui (New York) + Lucide icons          |
| ORM             | Prisma (SQLite dev → Supabase Postgres prod) |
| Auth            | Auth.js (NextAuth v4)                        |
| Cache           | Upstash Redis (serverless)                   |
| Search          | Meilisearch                                  |
| Storage         | Cloudinary                                   |
| i18n            | next-intl                                    |
| State (client)  | Zustand                                      |
| State (server)  | TanStack Query                               |
| Forms           | react-hook-form + Zod                        |
| AI              | Decoupled layer — providers interchangeable  |
| Deploy          | Vercel (app) + Cloudflare (edge/DNS)         |
| CI              | GitHub Actions                               |
| Observability   | GA4 · GSC · Clarity · Sentry · UptimeRobot   |
| Package manager | Bun                                          |
| Monorepo        | Bun workspaces + Turborepo                   |

## 6. Module Index (planned)

| Module               | Backlog Item                   | Status |
| -------------------- | ------------------------------ | ------ |
| Catalog              | 05 Catálogo de Produtos        | □      |
| Suppliers            | 06 Fornecedores (Dropshipping) | □      |
| Search               | 07 Busca                       | □      |
| Cart                 | 08 Carrinho                    | □      |
| Checkout             | 09 Checkout                    | □      |
| Payments             | 10 Pagamentos                  | □      |
| Orders               | 11 Pedidos                     | □      |
| Customers            | 12 Área do Cliente             | □      |
| Admin                | 13 Painel Administrativo       | □      |
| Marketing            | 14 Marketing                   | □      |
| SEO                  | 15 SEO                         | □      |
| CMS / Blog           | 16 Blog                        | □      |
| Analytics            | 17 Analytics                   | □      |
| AI                   | 18 IA                          | □      |
| Internationalization | 19 Internacionalização         | □      |

Legend: □ pending · ◐ in progress · ✔ done
