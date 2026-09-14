-- T061 — direito de arrependimento (art. 49 CDC / Decreto 7.962/2013):
-- solicitação de cancelamento com protocolo gravada no Order.
-- ALTER TABLE aditivo e IDEMPOTENTE (ADD COLUMN IF NOT EXISTS) — pode ser
-- reexecutado sem dano (dev Neon e PRODUÇÃO via Operador).

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancellationRequestedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancellationProtocol" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancellationStatus" TEXT;
