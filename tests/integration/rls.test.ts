/**
 * ShopFinder — Testes de integração RLS (#20, docs/eng/RLS.md)
 *
 * Valida que um role de serviço SEM bypass e SEM ownership vê 0 linhas
 * de outro tenant. Requer uma URL com role não-owner (o owner das tabelas
 * e superusers não são afetados pelas políticas):
 *
 *   RLS_TEST_DATABASE_URL=postgresql://rls_verify:<pass>@host/db
 *
 * Setup do role (uma vez, por um admin do banco):
 *   CREATE ROLE rls_verify LOGIN PASSWORD '<pass>' NOBYPASSRLS;
 *   GRANT USAGE ON SCHEMA public TO rls_verify;
 *   GRANT SELECT ON "Product" TO rls_verify;
 *
 * Sem a variável, os casos que dependem dela são pulados; o teste do
 * helper withTenantTransaction roda sempre (usa a DATABASE_URL normal).
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import { PrismaClient } from "@prisma/client";

const RLS_URL = process.env.RLS_TEST_DATABASE_URL;
const appDb = new PrismaClient();

describe("RLS — isolamento por tenant", () => {
  it.skipIf(!RLS_URL)("role sem bypass fora do tenant vê 0 produtos", async () => {
    const tenantDb = new PrismaClient({
      datasources: { db: { url: RLS_URL! } }
    });

    // Contexto de OUTRO tenant (inexistente) com role comum
    await tenantDb.$executeRawUnsafe(
      `SELECT set_config('app.store_id', 'tenant-que-nao-existe', false)`
    );
    await tenantDb.$executeRawUnsafe(`SELECT set_config('app.user_role', 'admin', false)`);

    // Somente a política public_read_catalog (produto publicado) pode
    // liberar linhas — nenhuma linha de OUTRO tenant pode vazar
    const leaked = await tenantDb.$queryRaw<
      Array<{ id: string; storeId: string }>
    >`SELECT "id", "storeId" FROM "Product" WHERE "storeId" <> 'tenant-que-nao-existe' LIMIT 5`;
    expect(leaked).toHaveLength(0); // leak cross-store = falha

    await tenantDb.$disconnect();
  });

  it.skipIf(!RLS_URL)("leitura anônima só enxerga produtos publicados", async () => {
    const tenantDb = new PrismaClient({
      datasources: { db: { url: RLS_URL! } }
    });
    await tenantDb.$executeRawUnsafe(
      `SELECT set_config('app.store_id', 'tenant-que-nao-existe', false)`
    );

    const visible = await tenantDb.$queryRaw<
      Array<{ status: string }>
    >`SELECT "status" FROM "Product" LIMIT 50`;
    for (const row of visible) {
      expect(row.status).toBe("published");
    }

    await tenantDb.$disconnect();
  });

  it("withTenantTransaction seta o contexto só dentro da transação", async () => {
    const { withTenantTransaction } = await import("../../packages/database/src/rls");

    const inside = await withTenantTransaction(
      appDb,
      { storeId: "tx-test-store", role: "operator" },
      async (tx) =>
        tx.$queryRaw<Array<{ store: string | null; role: string | null }>>`
          SELECT current_setting('app.store_id', true) AS store,
                 current_setting('app.user_role', true) AS role`
    );
    expect(inside[0]?.store).toBe("tx-test-store");
    expect(inside[0]?.role).toBe("operator");

    // Fora da transação o contexto local não persiste (is_local = true)
    const outside = await appDb.$queryRaw<
      Array<{ store: string | null }>
    >`SELECT current_setting('app.store_id', true) AS store`;
    expect(outside[0]?.store).not.toBe("tx-test-store");
  });
});
