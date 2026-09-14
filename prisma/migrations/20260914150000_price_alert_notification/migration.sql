-- T083 — alertas de preço + notificações in-app. Aditivo e idempotente.
-- Unicidade de alerta ATIVO por (productId, customerId) é PARTIAL no Postgres
-- (WHERE status = 'active'), então vive aqui no SQL e não no schema Prisma.
-- Email adiado (DECISAO-ALERTAS-001) — notificação é in-app.

CREATE TABLE IF NOT EXISTS "PriceAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "targetPriceMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'active',
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PriceAlert_product_customer_active_key"
    ON "PriceAlert"("productId", "customerId") WHERE "status" = 'active';
CREATE INDEX IF NOT EXISTS "PriceAlert_status_idx" ON "PriceAlert"("status");
CREATE INDEX IF NOT EXISTS "PriceAlert_customerId_idx" ON "PriceAlert"("customerId");
CREATE INDEX IF NOT EXISTS "PriceAlert_productId_idx" ON "PriceAlert"("productId");

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Notification_customer_createdAt_idx" ON "Notification"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_customer_readAt_idx" ON "Notification"("customerId", "readAt");
