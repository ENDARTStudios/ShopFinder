-- RLS — Row Level Security (docs/eng/RLS.md, issue #20)
--
-- Fase 1 (shadow): políticas criadas SEM FORCE ROW LEVEL SECURITY.
-- A conexão atual (owner das tabelas em dev/deploy) não é afetada —
-- as políticas passam a valer para roles de serviço sem bypass e,
-- depois dos testes de leak cross-store, para o app via FORCE.
--
-- Adaptado do doc para o schema real: somente tabelas com coluna
-- "storeId" recebem tenant_isolation (OrderItem/Integration/SyncJob/
-- ProductOffer são escopadas via relações — política JOIN é follow-up).

-- 1. Ativar RLS nas tabelas multi-tenant
ALTER TABLE "Store"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cart"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckoutSession"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"            ENABLE ROW LEVEL SECURITY;

-- 2. Política genérica por tenant (linhas do tenant corrente OU superadmin)
CREATE POLICY tenant_isolation ON "Store"
  USING (
    "id" = current_setting('app.store_id', true)
    OR current_setting('app.user_role', true) = 'superadmin'
  );

CREATE POLICY tenant_isolation ON "Category"
  USING (
    "storeId" = current_setting('app.store_id', true)
    OR current_setting('app.user_role', true) = 'superadmin'
  );

CREATE POLICY tenant_isolation ON "Product"
  USING (
    "storeId" = current_setting('app.store_id', true)
    OR current_setting('app.user_role', true) = 'superadmin'
  );

CREATE POLICY tenant_isolation ON "Customer"
  USING (
    "storeId" = current_setting('app.store_id', true)
    OR current_setting('app.user_role', true) = 'superadmin'
  );

CREATE POLICY tenant_isolation ON "Cart"
  USING (
    "storeId" = current_setting('app.store_id', true)
    OR current_setting('app.user_role', true) = 'superadmin'
  );

CREATE POLICY tenant_isolation ON "CheckoutSession"
  USING (
    "storeId" = current_setting('app.store_id', true)
    OR current_setting('app.user_role', true) = 'superadmin'
  );

CREATE POLICY tenant_isolation ON "Order"
  USING (
    "storeId" = current_setting('app.store_id', true)
    OR current_setting('app.user_role', true) = 'superadmin'
  );

-- User.storeId é nullable (superadmin sem loja): sem loja sempre visível
CREATE POLICY tenant_isolation ON "User"
  USING (
    "storeId" IS NULL
    OR "storeId" = current_setting('app.store_id', true)
    OR current_setting('app.user_role', true) = 'superadmin'
  );

-- 3. Catálogo público: leitura anônima do que está publicado
CREATE POLICY public_read_catalog ON "Product"
  FOR SELECT
  USING ("status" = 'published' AND "deletedAt" IS NULL);

CREATE POLICY public_read_catalog ON "Category"
  FOR SELECT
  USING ("deletedAt" IS NULL);
