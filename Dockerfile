# syntax=docker/dockerfile:1.7
#
# ShopFinder — Production Dockerfile (multi-stage).
#
# Produces a minimal image that runs the Next.js standalone server with
# the Prisma client, message catalogs, and supporting scripts.
#
# Stages:
#   1. deps    — install dependencies (cached layer)
#   2. builder — generate Prisma client + run next build → .next/standalone
#   3. runner  — final image, non-root user, only what's needed to run
#
# Build:
#   docker build -t shopfinder:latest .
#
# Run:
#   docker run -p 3000:3000 \
#     -e DATABASE_URL="postgresql://..." \
#     -e NEXTAUTH_SECRET="..." \
#     -e NEXTAUTH_URL="https://shopfinder.example.com" \
#     shopfinder:latest

# ── Stage 1: deps ──────────────────────────────────────────
FROM oven/bun:1.3-debian AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock turbo.json ./
COPY packages/*/package.json ./packages/*/
COPY prisma ./prisma

RUN bun install --frozen-lockfile

# ── Stage 2: builder ───────────────────────────────────────
FROM oven/bun:1.3-debian AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

COPY . .

# Select Prisma provider based on DATABASE_URL (SQLite dev / PostgreSQL prod)
RUN bun run scripts/select-prisma-provider.ts

# Generate Prisma client
RUN bun run db:generate

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build the standalone Next.js server
RUN bun run build

# ── Stage 3: runner (final image) ──────────────────────────
FROM oven/bun:1.3-debian AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates wget \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nextjs \
    && useradd --system --uid 1001 --gid nextjs nextjs

# Copy the standalone server
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Public assets
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# i18n message catalogs
COPY --from=builder --chown=nextjs:nextjs /app/messages ./messages

# Prisma schema + migrations + generated client
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/@prisma ./node_modules/@prisma

# Pipeline runner + supporting scripts
COPY --from=builder --chown=nextjs:nextjs /app/scripts ./scripts

# Fixture data for connectors (replay mode)
COPY --from=builder --chown=nextjs:nextjs /app/fixtures ./fixtures

# SQLite dev DB folder (empty in prod — DATABASE_URL points to PostgreSQL)
RUN mkdir -p /app/db && chown nextjs:nextjs /app/db

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --quiet --spider "http://localhost:3000/api/catalog?path=products&limit=1" || exit 1

CMD ["bun", "server.js"]
