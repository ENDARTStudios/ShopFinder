-- T101 Commerce Utility — histórico de preço (append-only). Aditivo e
-- idempotente: capturedDay (data UTC escrita pela app) + índice único
-- (offerId, capturedDay) tornam o snapshot diário idempotente por oferta.

CREATE TABLE IF NOT EXISTS "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "priceMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedDay" DATE NOT NULL,
    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PriceSnapshot_offer_day_key"
    ON "PriceSnapshot"("offerId", "capturedDay");
CREATE INDEX IF NOT EXISTS "PriceSnapshot_product_capturedAt_idx"
    ON "PriceSnapshot"("productId", "capturedAt");
