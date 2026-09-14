/**
 * @workspace/database/rls — Transações com contexto de tenant (RLS)
 *
 * Executa `SET LOCAL app.store_id / app.user_role` dentro da transação
 * via set_config(..., is_local = true): o contexto vale só até o COMMIT/
 * ROLLBACK e é a forma segura (parametrizada) exigida pelo docs/eng/RLS.md.
 *
 * Uso:
 *   const rows = await withTenantTransaction(prisma, { storeId, role: "admin" }, (tx) =>
 *     tx.product.findMany({ where: { storeId } })
 *   );
 */
import type { Prisma, PrismaClient } from "@prisma/client";

export interface TenantContext {
  storeId: string;
  /** Role do usuário na sessão — "superadmin" bypassa as políticas. */
  role: string;
}

export async function withTenantTransaction<T>(
  client: PrismaClient,
  tenant: TenantContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return client.$transaction(async (tx) => {
    // is_local=true: escopo da transação atual apenas
    await tx.$executeRaw`SELECT set_config('app.store_id', ${tenant.storeId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.user_role', ${tenant.role}, true)`;
    return fn(tx);
  });
}
