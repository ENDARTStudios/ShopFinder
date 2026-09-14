/**
 * @workspace/domain/discovery/compliance/repository
 */
import type {
  ComplianceRepository,
  CompliancePostCheckResult,
  ComplianceCheckId,
  CanonicalProductId,
  EvaluationId,
  ComplianceStreamFilter,
  CompliancePostStatus
} from "./types";

class InMemoryComplianceRepository implements ComplianceRepository {
  private readonly byId = new Map<string, CompliancePostCheckResult>();
  private readonly byProduct = new Map<string, CompliancePostCheckResult>();
  private readonly byEvaluation = new Map<string, CompliancePostCheckResult>();

  async appendPostCheck(result: CompliancePostCheckResult): Promise<CompliancePostCheckResult> {
    if (this.byId.has(result.id)) return this.byId.get(result.id)!;
    this.byId.set(result.id, result);
    this.byProduct.set(result.canonicalProductId, result);
    this.byEvaluation.set(result.evaluationId, result);
    return result;
  }

  async findPostCheck(id: ComplianceCheckId): Promise<CompliancePostCheckResult | null> {
    return this.byId.get(id) ?? null;
  }

  async findPostCheckByProduct(
    productId: CanonicalProductId
  ): Promise<CompliancePostCheckResult | null> {
    return this.byProduct.get(productId) ?? null;
  }

  async findPostCheckByEvaluation(
    evaluationId: EvaluationId
  ): Promise<CompliancePostCheckResult | null> {
    return this.byEvaluation.get(evaluationId) ?? null;
  }

  async *streamPostChecks(
    filter?: ComplianceStreamFilter
  ): AsyncIterable<CompliancePostCheckResult> {
    for (const r of this.byId.values()) {
      if (filter?.batchId && r.batchId !== filter.batchId) continue;
      if (filter?.status && r.status !== filter.status) continue;
      yield r;
    }
  }

  get postCheckCount(): number {
    return this.byId.size;
  }

  clear(): void {
    this.byId.clear();
    this.byProduct.clear();
    this.byEvaluation.clear();
  }
}

export function createComplianceRepository(): ComplianceRepository {
  return new InMemoryComplianceRepository();
}
