/**
 * @workspace/database/tests/contract-suite — Repository Contract Tests + Mapper Snapshot Tests
 *
 * Per Rec 2: abstract test suite every repository must pass.
 * Per Rec 3: Aggregate → Mapper → Prisma → Mapper → Aggregate == Aggregate.
 */

export interface RepositoryContractSuiteConfig<TAggregate> {
  readonly name: string;
  readonly createAggregate: () => TAggregate;
  readonly createRepository: () => {
    findById: (id: string) => Promise<TAggregate | null>;
    findByIdIncludingDeleted?: (id: string) => Promise<TAggregate | null>;
    save: (agg: TAggregate) => Promise<TAggregate>;
    delete: (id: string) => Promise<void>;
    restore?: (id: string) => Promise<void>;
  };
}

export interface ContractTestResult {
  readonly test: string;
  readonly passed: boolean;
  readonly error?: string;
  readonly durationMs: number;
}

export async function runRepositoryContractTests<
  TAggregate extends { id: string; version: number }
>(config: RepositoryContractSuiteConfig<TAggregate>): Promise<ContractTestResult[]> {
  const results: ContractTestResult[] = [];
  const tests: Array<[string, () => Promise<void>]> = [
    [
      "Create",
      async () => {
        const repo = config.createRepository();
        const agg = config.createAggregate();
        await repo.save(agg);
        const found = await repo.findById(agg.id);
        if (!found) throw new Error("Aggregate not found after save");
      }
    ],
    [
      "Update",
      async () => {
        const repo = config.createRepository();
        const agg = config.createAggregate();
        await repo.save(agg);
        const found = await repo.findById(agg.id);
        if (!found) throw new Error("Not found before update");
        await repo.save(found);
      }
    ],
    [
      "SoftDelete",
      async () => {
        const repo = config.createRepository();
        const agg = config.createAggregate();
        await repo.save(agg);
        await repo.delete(agg.id);
        const found = await repo.findById(agg.id);
        if (found) throw new Error("Aggregate should be soft-deleted");
      }
    ],
    [
      "OptimisticLock",
      async () => {
        const repo = config.createRepository();
        const agg = config.createAggregate();
        await repo.save(agg);
        const found = await repo.findById(agg.id);
        if (!found) throw new Error("Not found for lock test");
        const stale = { ...found, version: found.version - 1 };
        try {
          await repo.save(stale);
          throw new Error("Should have thrown OptimisticLockError");
        } catch (e) {
          if (!(e instanceof Error && e.message.includes("Optimistic lock")))
            throw new Error(`Expected OptimisticLockError, got: ${(e as Error).message}`);
        }
      }
    ],
    [
      "NotFound",
      async () => {
        const repo = config.createRepository();
        const found = await repo.findById("nonexistent_id_12345");
        if (found !== null) throw new Error("Should return null for nonexistent ID");
      }
    ]
  ];

  if (config.createRepository().restore) {
    tests.push([
      "Restore",
      async () => {
        const repo = config.createRepository();
        const agg = config.createAggregate();
        await repo.save(agg);
        await repo.delete(agg.id);
        await repo.restore!(agg.id);
        const found = await repo.findById(agg.id);
        if (!found) throw new Error("Aggregate not found after restore");
      }
    ]);
  }

  for (const [name, fn] of tests) {
    const start = Date.now();
    try {
      await fn();
      results.push({ test: name, passed: true, durationMs: Date.now() - start });
    } catch (error) {
      results.push({
        test: name,
        passed: false,
        error: (error as Error).message,
        durationMs: Date.now() - start
      });
    }
  }
  return results;
}

export interface MapperSnapshotTestConfig<TAggregate> {
  readonly name: string;
  readonly createAggregate: () => TAggregate;
  readonly toPrisma: (agg: TAggregate) => unknown;
  readonly toAggregate: (prisma: unknown) => TAggregate;
  readonly compare: (a: TAggregate, b: TAggregate) => boolean;
}

export async function runMapperSnapshotTest<TAggregate>(
  config: MapperSnapshotTestConfig<TAggregate>
): Promise<ContractTestResult> {
  const start = Date.now();
  try {
    const original = config.createAggregate();
    const prisma = config.toPrisma(original);
    const roundTripped = config.toAggregate(prisma);
    if (!config.compare(original, roundTripped)) throw new Error("Round-trip mismatch");
    return { test: `MapperSnapshot:${config.name}`, passed: true, durationMs: Date.now() - start };
  } catch (error) {
    return {
      test: `MapperSnapshot:${config.name}`,
      passed: false,
      error: (error as Error).message,
      durationMs: Date.now() - start
    };
  }
}
