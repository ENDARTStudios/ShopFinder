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

## Passos de adoção (issue #20)

| Passo                                        | Estado                                                                                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Migration `enable_rls` sem FORCE (shadow) | ✅ `prisma/migrations/20260819231500_enable_rls` — políticas em Store, User, Category, Product, Customer, Cart, CheckoutSession, Order (tabelas com `storeId` no schema real) |
| 2. `app.store_id` por transação via Prisma   | ✅ `withTenantTransaction` em `@workspace/database/rls` (set_config is_local, parametrizado)                                                                                  |
| 3. Teste de leak cross-store                 | ✅ `tests/integration/rls.test.ts` — casos de role sem bypass exigem `RLS_TEST_DATABASE_URL`; helper testado na DATABASE_URL normal                                           |
| 4. FORCE + remoção do shadow                 | ⏳ Após teste com role de serviço em staging                                                                                                                                  |

Notas de adaptação ao schema real:

- `OrderItem`, `Integration`, `SyncJob`, `ProductOffer` e `SupplierCredential` **não têm** coluna `storeId` (escopo via relações) — política por JOIN é follow-up antes do FORCE.
- `User.storeId` é nullable: política trata `IS NULL` como sempre visível.
- `public_read_catalog` usa `status = 'published'` (valores reais do enum de string: draft | published | archived).
- Papéis de serviço: em dev a conexão é owner (políticas não a afetam). Em produção, conectar como role `NOBYPASSRLS` (ex.: `shopfinder_app`) antes do passo 4.
