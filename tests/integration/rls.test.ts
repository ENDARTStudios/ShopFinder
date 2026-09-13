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
 * CI-RUNNABLE (#47/T074): o job `integration` do ci.yml sobe postgres:16,
 * aplica migrações (políticas RLS inclusas), cria o role `rls_verify` e
 * exporta RLS_TEST_DATABASE_URL — o teste executa de verdade a cada push.
 *
 * Sem a variável, os casos que dependem dela são pulados COM marcador
 * explícito ("skipped: RLS DB não configurada") — nunca falham nem passam
 * falso; as invariantes foram validadas manualmente com container +
 * role não-owner (T073, DECISOES). O teste do helper withTenantTransaction
 * roda sempre (usa a DATABASE_URL normal).
 */
/// <reference types="bun-types" />
import { describe, it, expect, beforeAll } from "bun:test";
import { PrismaClient } from "@prisma/client";

const RLS_URL = process.env.RLS_TEST_DATABASE_URL;
const appDb = new PrismaClient();

describe("RLS — isolamento por tenant", () => {
  beforeAll(async () => {
    if (!RLS_URL) return;
    // Grants de leitura para o role de verificação (idempotente, via owner)
    await appDb.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO rls_verify`);
    await appDb.$executeRawUnsafe(`GRANT SELECT ON "Product" TO rls_verify`);
    await appDb.$executeRawUnsafe(`GRANT SELECT ON "Customer" TO rls_verify`);
    await appDb.$executeRawUnsafe(`GRANT SELECT ON "Store" TO rls_verify`);
  });

  // T074 — marcador explícito de skip (nunca falha nem passa falso).
  if (!RLS_URL) {
    console.log("skipped: RLS DB não configurada (RLS_TEST_DATABASE_URL ausente) — invariantes validadas manualmente (T073)");
  }

  it.skipIf(!RLS_URL)("fora do tenant: nada além do catálogo público vaza", async () => {
    const tenantDb = new PrismaClient({
      datasources: { db: { url: RLS_URL! } }
    });

    // Contexto de OUTRO tenant (inexistente) com role comum
    await tenantDb.$executeRawUnsafe(
      `SELECT set_config('app.store_id', 'tenant-que-nao-existe', false)`
    );
    await tenantDb.$executeRawUnsafe(`SELECT set_config('app.user_role', 'admin', false)`);

    // Desenho (RLS.md §5): a política public_read_catalog libera PRODUTOS
    // PUBLICADOS para leitura anônima. O invariante de isolamento é: nenhum
    // dado NÃO-público (draft/review/archived) e nenhum dado sensível de
    // outra loja (Customer) pode vazar para quem está fora do tenant.
    const nonPublic = await tenantDb.$queryRaw<
      Array<{ status: string }>
    >`SELECT "status" FROM "Product" WHERE "status" <> 'published' LIMIT 5`;
    expect(nonPublic).toHaveLength(0); // leak de não-publicado = falha

    // Customers de outro tenant são PII — sempre 0 para fora do tenant
    const leakedCustomers = await tenantDb.$queryRaw<
      Array<{ id: string }>
    >`SELECT "id" FROM "Customer" LIMIT 5`;
    expect(leakedCustomers).toHaveLength(0);

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
