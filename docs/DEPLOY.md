# ShopFinder — Deployment Guide

**URL de produção:** `<URL_DO_OPERADOR>` (a confirmar)  
**Plataforma:** Vercel + Neon (PostgreSQL)  
**Status:** Deploy concluído em 2026-07-17

This document covers environment variables, database setup, Docker, and
connector activation for production deployment.

> **Sandbox note**: the dev environment uses SQLite. Production requires
> PostgreSQL (Neon recommended — see `PENDENCIAS_OPERADOR.md` item [2]).

---

## 1. Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
# Core
NODE_ENV=production
NEXTAUTH_URL=https://shopfinder.example.com
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require"

# Auth (initial admin — created by seed script)
ADMIN_EMAIL="admin@endart.com"
ADMIN_PASSWORD="<strong-password>"
```

---

## 2. Connector activation (live data ingestion)

### eBay Browse API (plug-and-play)

The eBay connector is the only connector currently recriated (REC-004).
It detects credentials automatically and falls back to fixtures when
they're missing.

```bash
# 1. Get credentials: https://developer.ebay.com/ → Sign up → Create Key Set (Sandbox)
# 2. Add to .env:
EBAY_APP_ID=MyApp-1234
EBAY_CERT_ID=secret-5678
EBAY_SANDBOX=true   # set false for production

# 3. Restart the app
# 4. Verify on /admin/pipeline — eBay connector card shows "LIVE" badge

# 5. Run the pipeline
bun run scripts/run-pipeline.ts
```

### DigiKey and Amazon

**Not yet implemented.** The connector infrastructure (Transport layer,
FetchTransport with OAuth2) is ready, but the DigiKey and Amazon connector
classes have not been recriated yet. They show as `not_configured` in the
pipeline status page. When recriated, activation will follow the same
pattern as eBay (set env vars → restart → live mode).

---

## 3. Docker deployment

### Build the image

```bash
docker build -t shopfinder:latest .
```

### Docker Compose (with PostgreSQL + Redis)

Use `docker-compose.yml` (already in the repo) for PostgreSQL 17 + Redis +
MinIO. Create a `docker-compose.app.yml` for the app:

```yaml
services:
  app:
    image: shopfinder:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
```

### Health checks

```bash
curl -fsS http://localhost:3000/api/catalog?path=products&limit=1
docker compose exec postgres pg_isready -U aicommerce
```

---

## 4. First-time setup

After the containers are up:

```bash
# 1. Apply database migrations
npx prisma migrate deploy

# 2. Generate Prisma client
bun run db:generate

# 3. Run the discovery pipeline
bun run scripts/run-pipeline.ts
```

---

## 5. Reverse proxy (Caddy)

The repo ships with a `Caddyfile`:

```caddyfile
shopfinder.example.com {
    reverse_proxy localhost:3000
}
```

Caddy will automatically provision a Let's Encrypt certificate.

---

## 6. Security checklist

- [ ] `NEXTAUTH_SECRET` is a strong random value (≥ 32 bytes)
- [ ] `DATABASE_URL` password is changed from default
- [ ] `NODE_ENV=production` is set
- [ ] `/admin/*` routes behind authentication
- [ ] HTTPS enforced (Caddy auto-HTTPS or Nginx redirect)
- [ ] Rate limiting configured at reverse proxy layer
- [ ] Database backups running and tested
