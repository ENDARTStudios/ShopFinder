/**
 * Discovery types — all contracts in one file (no circular deps)
 */
import type { Money, EntityId } from "../shared";
import type {
  NormalizedDiscoveredProduct,
  CanonicalProductId,
  AIScoreFactors
} from "../marketplace";

export type DiscoveryJobId = import("../shared").BrandedId<"DiscoveryJobId">;
export type DiscoveryJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type DiscoveryJobType =
  | "trending"
  | "category_scan"
  | "keyword_search"
  | "inventory_sync"
  | "price_sync"
  | "full_catalog";

export interface DiscoveryJob {
  readonly id: DiscoveryJobId;
  readonly type: DiscoveryJobType;
  readonly providerCode: string;
  readonly category?: string;
  readonly keyword?: string;
  readonly region: string;
  readonly language: string;
  readonly cursor?: string;
  readonly priority: number;
  readonly status: DiscoveryJobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly createdAt: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly lastError?: string;
  readonly result?: DiscoveryJobResult;
  /** R6: ID of the parent DiscoveryPlan — for debugging and lineage queries. */
  readonly parentPlanId: string;
  /** R6: 0-indexed position within the parent plan's job set. */
  readonly sequenceNumber: number;
}
export interface DiscoveryJobResult {
  readonly productsDiscovered: number;
  readonly productsNormalized: number;
  readonly duplicatesFound: number;
  readonly productsApproved: number;
  readonly nextCursor?: string;
  readonly hasMore: boolean;
}

export type DiscoveryCheckpointId = import("../shared").BrandedId<"DiscoveryCheckpointId">;
export interface DiscoveryCheckpoint {
  readonly id: DiscoveryCheckpointId;
  readonly jobId: DiscoveryJobId;
  readonly providerCode: string;
  readonly category?: string;
  readonly cursor: string;
  readonly page: number;
  readonly itemsProcessed: number;
  readonly lastUpdatedAt: Date;
}

// RawProductRecord and RawProductRecordId moved to raw-store/types.ts (A2.4).
// The richer design includes: executionId, compressed payload, payloadHash,
// semanticHash, partitionKey, full versioning. Re-exported from raw-store.

export type DuplicateCandidateId = import("../shared").BrandedId<"DuplicateCandidateId">;
export type DuplicateStatus = "pending" | "confirmed" | "rejected" | "merged";
export interface DuplicateCandidate {
  readonly id: DuplicateCandidateId;
  readonly productAId: string;
  readonly productBId: string;
  readonly providerA: string;
  readonly providerB: string;
  readonly similarityScore: number;
  readonly similarityFactors: SimilarityFactors;
  readonly status: DuplicateStatus;
  readonly canonicalProductId?: CanonicalProductId;
  readonly decidedAt?: Date;
  readonly decidedBy?: "ai" | "human" | "auto";
  readonly createdAt: Date;
}
export interface SimilarityFactors {
  readonly titleSimilarity: number;
  readonly imageSimilarity: number;
  readonly attributeSimilarity: number;
  readonly priceProximity: number;
  readonly brandMatch: boolean;
  readonly categoryMatch: boolean;
  readonly skuMatch: boolean;
}
export interface SimilarityService {
  compare(
    a: NormalizedDiscoveredProduct,
    b: NormalizedDiscoveredProduct
  ): Promise<SimilarityResult>;
}
export interface SimilarityResult {
  readonly score: number;
  readonly factors: SimilarityFactors;
  readonly recommendation: "same" | "similar" | "different";
}

export type EvaluationRequestId = import("../shared").BrandedId<"EvaluationRequestId">;
export interface EvaluationRequest {
  readonly id: EvaluationRequestId;
  readonly product: NormalizedDiscoveredProduct;
  readonly context?: EvaluationContext;
}
export interface EvaluationContext {
  readonly storeId?: string;
  readonly region?: string;
  readonly targetMargin?: number;
  readonly competitorPrices?: Array<{ provider: string; price: Money }>;
}
export interface EvaluationResult {
  readonly requestId: EvaluationRequestId;
  readonly aiScore: number;
  readonly confidence: number;
  readonly factors: AIScoreFactors;
  readonly recommendation: "publish" | "review" | "reject";
  readonly reasons: string[];
  readonly suggestedPrice?: Money;
  readonly evaluatedAt: Date;
  readonly modelUsed: string;
}

export interface ApprovalDecision {
  readonly action: "publish" | "review" | "reject";
  readonly reason: string;
  readonly conditions?: string[];
}
export interface ApprovalPolicy {
  evaluate(result: EvaluationResult): ApprovalDecision;
}
export const DefaultApprovalPolicy: ApprovalPolicy = {
  evaluate(r) {
    if (r.aiScore >= 70 && r.confidence >= 80)
      return { action: "publish", reason: `Score ${r.aiScore} confidence ${r.confidence}` };
    if (r.aiScore >= 50) return { action: "review", reason: `Score ${r.aiScore} requires review` };
    return { action: "reject", reason: `Score ${r.aiScore} below threshold` };
  }
};

export interface DiscoveryScheduler {
  schedule(params: ScheduleParams): DiscoveryJob;
  getNextJobs(limit: number): DiscoveryJob[];
  markRunning(id: DiscoveryJobId): void;
  markCompleted(id: DiscoveryJobId, r: DiscoveryJobResult): void;
  markFailed(id: DiscoveryJobId, e: string): void;
}
export interface ScheduleParams {
  readonly type?: DiscoveryJobType;
  readonly providerCode?: string;
  readonly category?: string;
  readonly region?: string;
  readonly priority?: number;
}

// Planning contracts
export type SignalType =
  | "trend"
  | "search_volume"
  | "margin_opportunity"
  | "provider_quality"
  | "api_cost"
  | "error_rate"
  | "seasonality"
  | "competitor_activity"
  | "stock_velocity"
  | "customer_demand"
  | "niche_growth"
  | "price_volatility";
export type SignalStrength = "low" | "medium" | "high" | "critical";
export interface DiscoverySignal {
  readonly id: string;
  readonly type: SignalType;
  readonly strength: SignalStrength;
  readonly value: number;
  readonly source: "ai" | "analytics" | "manual" | "external";
  readonly scope: SignalScope;
  readonly description: string;
  readonly generatedAt: Date;
  readonly expiresAt?: Date;
}
export interface SignalScope {
  readonly providerCode?: string;
  readonly category?: string;
  readonly region?: string;
  readonly niche?: string;
  readonly productId?: string;
}

export type DiscoveryPlanId = import("../shared").BrandedId<"DiscoveryPlanId">;
export type PlanStatus = "draft" | "approved" | "executing" | "completed" | "cancelled" | "failed";
export interface DiscoveryPlan {
  readonly id: DiscoveryPlanId;
  readonly name: string;
  readonly sources: ReadonlyArray<{
    sourceId: string;
    sourceType: string;
    providerCode: string;
    capabilities: string[];
  }>;
  readonly categories: string[];
  readonly regions: string[];
  readonly languages: string[];
  readonly niches: string[];
  readonly priority: DiscoveryPriority;
  readonly budget: DiscoveryBudgetAllocation;
  readonly estimatedProducts: number;
  readonly estimatedDuration: number;
  readonly estimatedCost?: Money;
  readonly status: PlanStatus;
  readonly signals: DiscoverySignal[];
  readonly createdAt: Date;
}

export interface DiscoveryPriority {
  readonly urgency: number;
  readonly potentialValue: number;
  readonly competitionLevel: number;
  readonly providerReliability: number;
  readonly costEfficiency: number;
}
export interface DiscoveryBudgetAllocation {
  readonly totalApiCalls: number;
  readonly perSource: Record<string, number>;
  readonly perRegion: Record<string, number>;
  readonly perCategory: Record<string, number>;
  readonly maxCost?: Money;
}

export interface DiscoveryBudget {
  readonly id: string;
  readonly period: string;
  readonly maxApiCalls: number;
  readonly maxProductsDiscovered: number;
  readonly maxCost?: Money;
  readonly currentUsage: {
    apiCallsUsed: number;
    productsDiscovered: number;
    costIncurred: Money;
    perSourceUsage: Record<string, { apiCalls: number; cost: Money }>;
    perRegionUsage: Record<string, { apiCalls: number; products: number }>;
    perCategoryUsage: Record<string, { apiCalls: number; products: number }>;
  };
  readonly resetAt: Date;
}

export interface BudgetAllocator {
  allocate(
    plan: DiscoveryPlan,
    budget: DiscoveryBudget
  ): {
    approved: boolean;
    allocatedCalls: number;
    perSource: Record<string, number>;
    reason?: string;
  };
}

// Discovery events
export type DiscoveryEventType =
  | "discovery.requested"
  | "discovery.started"
  | "discovery.completed"
  | "discovery.failed"
  | "discovery.products_normalized"
  | "discovery.duplicates_detected"
  | "discovery.evaluation_completed"
  | "discovery.product_approved"
  | "discovery.product_rejected"
  | "discovery.product_published"
  | "discovery.checkpoint_saved"
  | "discovery.raw_product_stored";

// Marketplace taxonomy
export type CanonicalCategoryId = import("../shared").BrandedId<"CanonicalCategoryId">;
export interface CanonicalCategory {
  readonly id: CanonicalCategoryId;
  readonly name: string;
  readonly slug: string;
  readonly parentId?: CanonicalCategoryId;
  readonly path: string[];
  readonly niches: string[];
}
export interface MarketplaceTaxonomy {
  mapCategory(providerCode: string, marketplaceCategory: string): CanonicalCategory | null;
  getCategoryTree(): CanonicalCategory[];
}

// Discovery sources
export type DiscoverySourceId = import("../shared").BrandedId<"DiscoverySourceId">;
export type DiscoverySourceType =
  | "api_official"
  | "feed_xml"
  | "feed_csv"
  | "partner_program"
  | "marketplace_api"
  | "manufacturer_direct"
  | "distributor_api";
export interface DiscoverySource {
  readonly id: DiscoverySourceId;
  readonly name: string;
  readonly code: string;
  readonly type: DiscoverySourceType;
  readonly capabilities: string[];
  readonly active: boolean;
}
export interface SourceCompliance {
  readonly supportsDropshipping: boolean;
  readonly supportsAPI: boolean;
  readonly supportsBranding: boolean;
  readonly requiresPartnerProgram: boolean;
  readonly allowedRegions: string[];
  readonly prohibitedRegions: string[];
}

// ProductEvaluationProvider (AI as provider)
export interface ProductEvaluationProvider {
  readonly providerCode: string;
  readonly providerName: string;
  readonly modelVersion: string;
  evaluate(request: EvaluationRequest): Promise<EvaluationResult>;
}

// ComplianceEngine
export interface ComplianceEngine {
  validate(
    product: NormalizedDiscoveredProduct,
    regions: string[]
  ): { passed: boolean; violations: string[]; warnings: string[] };
}
