-- T075 — waitlist de pré-lançamento: email capture com nicho e locale.
-- Aditiva e idempotente (IF NOT EXISTS) — pode ser reexecutada sem dano.

CREATE TABLE IF NOT EXISTS "Waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "niche" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Waitlist_email_key" ON "Waitlist"("email");
CREATE INDEX IF NOT EXISTS "Waitlist_createdAt_idx" ON "Waitlist"("createdAt");
