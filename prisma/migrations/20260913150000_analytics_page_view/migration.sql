-- T077 — analytics first-party cookieless: pageviews agregados sem PII
-- (sem cookie, sem IP cru, sem identificador). Aditivo e idempotente.

CREATE TABLE IF NOT EXISTS "AnalyticsPageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrerHost" TEXT,
    "device" TEXT NOT NULL DEFAULT 'desktop',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsPageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsPageView_createdAt_idx" ON "AnalyticsPageView"("createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsPageView_path_createdAt_idx" ON "AnalyticsPageView"("path", "createdAt");
