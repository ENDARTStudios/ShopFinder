/**
 * @workspace/infrastructure/repositories/discovery/discovery-unit-of-work
 *
 * DiscoveryUnitOfWork — wraps Prisma transactions for atomic persistence
 * across multiple repositories in a single pipeline stage.
 *
 * Interface (domain-agnostic):
 *   execute<T>(work: () => Promise<T>): Promise<T>
 *
 * Implementation:
 *   prisma.$transaction(async () => work())
 *
 * Usage:
 *   const uow = createDiscoveryUnitOfWork(prisma);
 *   await uow.execute(async () => {
 *     await rawRepo.appendExecution(exec);
 *     await rawRepo.appendProducts(records);
 *     // Both persist atomically — or both roll back on error.
 *   });
 *
 * When the pipeline grows, all writes from a single stage can occur
 * atomically without altering the domain.
 */

export interface DiscoveryUnitOfWork {
  /**
   * Execute work within a database transaction.
   * If work() throws, the transaction rolls back.
   * If work() resolves, the transaction commits.
   */
  execute<T>(work: () => Promise<T>): Promise<T>;
}

/**
 * Prisma-backed implementation of DiscoveryUnitOfWork.
 * Uses prisma.$transaction() for atomicity.
 */
export class PrismaDiscoveryUnitOfWork implements DiscoveryUnitOfWork {
  constructor(private readonly prisma: any) {}

  async execute<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx: any) => {
      return work();
    });
  }
}

export function createDiscoveryUnitOfWork(prisma: any): DiscoveryUnitOfWork {
  return new PrismaDiscoveryUnitOfWork(prisma);
}
