# ShopFinder

Plataforma de comparação de preços e intermediação de compras de hardware e eletrônicos — catálogo unificado, preços em BRL com conversão ao vivo, checkout via Stripe e integração com múltiplos fornecedores (DigiKey, eBay e outros).

## Stack

- **App**: Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4 — em `src/`
- **Monorepo**: Bun workspaces + Turborepo — pacotes compartilhados em `packages/*` (domínio, aplicação, infraestrutura, auth, UI, observabilidade...)
- **Banco**: PostgreSQL (Neon em produção) via Prisma — schema em `prisma/`
- **Testes**: Bun test (unit/integração) + Playwright (E2E)
- **i18n**: pt-BR · en-US · es-ES (seletor no header; conteúdo legal incluído)

## Pré-requisitos

| Ferramenta | Versão |
|---|---|
| [Bun](https://bun.sh) | ≥ 1.3 |
| Node.js | ≥ 20.9 (para tooling que exige Node) |
| PostgreSQL | 16+ (ou usar o `docker-compose.yml`) |

## Quick start

```bash
bun install                # dependências + geração do client Prisma
cp .env.example .env       # preencha DATABASE_URL, NEXTAUTH_SECRET, etc.
bun run db:push            # sincroniza o schema com o banco
bun run db:seed            # popula catálogo (opcional)
bun run dev                # http://localhost:3000
```

Infra local (Postgres + PgBouncer + MinIO + Redis):

```bash
docker compose up -d
```

## Scripts principais

| Comando | O que faz |
|---|---|
| `bun run dev` | Dev server em :3000 |
| `bun run build` | Build de produção |
| `bun run start` | Servidor de produção |
| `bun run lint` / `bun run format` | ESLint / Prettier |
| `bun run test` | Testes unitários |
| `bun run test:integration` | Testes de integração |
| `bun run test:e2e` | E2E (Playwright) |
| `bun run typecheck` | TypeScript em todo o monorepo |
| `bun run db:push` / `db:migrate` / `db:studio` | Prisma |

## Estrutura

```
src/            Aplicação Next.js (App Router, API routes, componentes)
packages/       Pacotes compartilhados (@workspace/domain, application,
                infrastructure, database, auth, ui, observability...)
messages/       Catálogos de mensagens i18n (pt-BR, en, es-ES)
prisma/         Schema e migrations do banco
scripts/        Scripts de automação (seed, auditorias, smoke tests)
docs/           Documentação (engenharia, governança, decisões)
tests/          Testes unitários e de integração
docker/         Dockerfile da app e Caddyfile
```

## Documentação

- [`docs/eng/`](docs/eng) — PRD, arquitetura, segurança, testes, observabilidade
- [`docs/adr/`](docs/adr) — decisões de arquitetura (ADRs)
- [`docs/DECISOES.md`](docs/DECISOES.md) — registro de decisões do projeto
- [`AGENTS.md`](AGENTS.md) — padrão de trabalho para agentes de IA

## Deploy

Produção na Vercel (`main` → deploy automático). Dockerfile multi-stage em `docker/` para self-hosting.
