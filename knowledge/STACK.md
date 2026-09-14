# Stack — ShopFinder

| Layer | Technology | Version |
|---|---|---|
| **Runtime** | Bun | 1.3.x |
| **Language** | TypeScript | 5.x |
| **Frontend** | Next.js (App Router, Turbopack) | 16.1.x |
| **UI Framework** | React | 19.x |
| **CSS** | Tailwind CSS | 4.x |
| **Components** | shadcn/ui | latest |
| **Icons** | lucide-react | 0.525.x |
| **ORM** | Prisma | 6.x |
| **Database (dev)** | SQLite | via `db/custom.db` |
| **Database (prod)** | PostgreSQL | 17 |
| **Connection Pool** | PgBouncer | (prod only) |
| **Object Storage** | MinIO (S3-compatible) | (prod only) |
| **Queue** | BullMQ + Redis | (prod only) |
| **Observability** | OpenTelemetry | tracer, metrics, logger |
| **Testing** | Bun test (`bun:test`) | built-in |
| **Linting** | ESLint | flat config |
| **Formatting** | Prettier | via lint-staged |
| **Git Hooks** | Husky + commitlint + lint-staged | conventional commits |
| **Monorepo** | Turborepo workspaces | `packages/*` |
| **Containerization** | Docker Compose | PostgreSQL + PgBouncer + MinIO + Redis |
| **Reverse Proxy** | Caddy | (prod only) |

## Environment variables

Key variables (see `.env.example` for full list):
- `DATABASE_URL` — SQLite path (dev) or PostgreSQL URL (prod)
- `OPENAI_API_KEY` — for InferenceProvider (AI Evaluation stage)
- `REDIS_URL` — for BullMQ (async processing)
- `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` — for ObjectStorage

## Package manager

Bun (`bun install`, `bun run`, `bun test`). Lockfile: `bun.lock`.
