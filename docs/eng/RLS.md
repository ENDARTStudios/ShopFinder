# RLS — Row Level Security (PostgreSQL)

## Situação atual

**RLS não está ativa** — autorização é apenas em aplicação (middleware + `resolvePermissions`). RLS no banco é a segunda camada de defesa: mesmo com um bug na aplicação, o Postgres impede vazamento cross-store.

## Estratégia

1. Aplicação conecta com usuário de serviço `shopfinder_app`.
2. Após autenticação, a aplicação executa `SET LOCAL app.store_id = '<store>'` e `SET LOCAL app.user_role = '<role>'` por transação (Prisma: `$executeRaw` dentro de `prisma.$transaction` com `BEGIN...SET LOCAL` via client interativo ou pgbouncer em modo session).
3. Políticas comparam `store_id` com `current_setting('app.store_id', true)`.
4. `superadmin` bypass via role `app.role = 'superadmin'`.

## SQL de ativação (migration alvo)

```sql
-- 1. Usuário de serviço sem bypass
ALTER ROLE shopfinder_app NOBYPASSRLS;

-- 2. Ativar RLS em tabelas multi-tenant
ALTER TABLE "Store"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cart"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductOffer"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncJob"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierCredential" ENABLE ROW LEVEL SECURITY;

-- 3. Política genérica por tenant
CREATE POLICY tenant_isolation ON "Product"
  USING (
    "storeId" = current_setting('app.store_id', true)::text
    OR current_setting('app.user_role', true) = 'superadmin'
  );

-- Repetir tenant_isolation para: "Category", "Order", "OrderItem",
-- "Customer", "Cart", "ProductOffer", "SyncJob", "Integration".

-- 4. Credenciais de fornecedor: somente integrations_operator+
CREATE POLICY supplier_cred_isolation ON "SupplierCredential"
  USING (
    ("storeId" IS NULL OR "storeId" = current_setting('app.store_id', true)::text)
    AND current_setting('app.user_role', true) IN ('superadmin','store_admin','integrations_operator')
  );

-- 5. Catálogo público: leitura liberada quando store_id não está setado (leitura anônima)
CREATE POLICY public_read_catalog ON "Product"
  FOR SELECT
  USING ("status" = 'ACTIVE' AND "deletedAt" IS NULL);
```

## Passos de adoção (issue rastreada)

1. Migration `enable_rls` com `FORCE ROW LEVEL SECURITY` desligado (modo shadow: logar linhas que seriam bloqueadas).
2. Setar `app.store_id` nas transações via Prisma client extension.
3. Testes de integração: tentativa de leak cross-store deve retornar 0 linhas.
4. Ativar `FORCE ROW LEVEL SECURITY` e remover políticas shadow.
