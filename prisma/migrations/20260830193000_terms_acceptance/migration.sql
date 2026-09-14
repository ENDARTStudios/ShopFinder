-- T051 — aceite obrigatório de termos no cadastro
-- ALTER TABLE aditivo (não destrutivo): apenas 2 colunas novas, NULLABLE.
-- Idempotente para execução manual? Não — rode uma única vez por banco.
-- Aplicar em PRODUÇÃO após o deploy do código (antes aceitável: o handler
-- degrada graciosamente se as colunas não existirem).

ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT;
