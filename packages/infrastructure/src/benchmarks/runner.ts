/**
 * @workspace/infrastructure/benchmarks/runner
 *
 * BenchmarkRunner — orchestrates the full benchmark suite.
 *
 * Measures:
 *   1. Throughput: products/s for each pipeline stage
 *   2. Latency: avg/P50/P95/P99/max per stage
 *   3. Cost: tokens and $ per product (AI evaluation)
 *   4. Memory: heap usage during execution
 *
 * Usage:
 *   const runner = new BenchmarkRunner({ productCount: 1000 });
 *   const report = await runner.run();
 *   console.log(formatReport(report));
 */
import type { BenchmarkReport, BenchmarkConfig } from "./types";
import { ThroughputBenchmark } from "./throughput";
import { LatencyBenchmark } from "./latency";
import { CostBenchmark } from "./cost";
import { MemoryBenchmark } from "./memory";
import { generateProducts } from "./fixtures";
import { buildSummary } from "./report";
import { DefaultProductNormalizer } from "@workspace/domain/discovery/normalizer/normalizer";
import { DefaultNormalizerVersions } from "@workspace/domain/discovery/normalizer/types";
import { StubInferenceProvider } from "@workspace/domain/discovery/evaluation/inference-provider";
import { DefaultDecisionProvider } from "@workspace/domain/discovery/evaluation/decision-provider";
import { DefaultPolicyEngine } from "@workspace/domain/discovery/evaluation/policy";
import { estimateTokens } from "../ai/shared/token-counter";
import { computeInferenceCost } from "../ai/openai/pricing";

export class BenchmarkRunner {
  private readonly config: BenchmarkConfig;
  private readonly throughput = new ThroughputBenchmark();
  private readonly latency = new LatencyBenchmark();
  private readonly cost: CostBenchmark;
  private readonly memory = new MemoryBenchmark();

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      productCount: 1000,
      stages: ["discovery", "normalization", "evaluation"],
      skipAI: false,
      warmupIterations: 10,
      ...config,
    };
    this.cost = new CostBenchmark("gpt-4o-mini");
  }

  async run(): Promise<BenchmarkReport> {
    const startedAt = new Date().toISOString();
    const totalStart = Date.now();

    console.log(`\n🏁 Benchmark starting: ${this.config.productCount.toLocaleString()} products`);
    this.memory.capture();

    // ── Generate fixtures ──────────────────────────────────
    console.log("\n📦 Generating fixtures...");
    const products = generateProducts(this.config.productCount);
    console.log(`   ${products.length} products generated`);

    // ── Warmup ─────────────────────────────────────────────
    if (this.config.warmupIterations && this.config.warmupIterations > 0) {
      console.log(`\n🔥 Warming up (${this.config.warmupIterations} iterations)...`);
      const warmupProducts = generateProducts(this.config.warmupIterations);
      const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
      for (const p of warmupProducts) {
        const raw = {
          id: `warmup_${p.externalId}` as any,
          executionId: "warmup" as any,
          providerCode: p.marketplace,
          externalId: p.externalId,
          payload: new TextEncoder().encode(JSON.stringify(p)),
          payloadHash: `ph_warmup_${p.externalId}`,
          discoveredAt: new Date(),
          partitionKey: "warmup",
          versions: { schemaVersion: "1.0.0" } as any,
        };
        await normalizer.normalize(raw, p);
      }
    }

    // ── Stage 1: Discovery (simulated) ─────────────────────
    console.log("\n── Stage 1: Discovery ──");
    this.memory.capture();
    await this.throughput.measure("discovery", this.config.productCount, async () => {
      for (const product of products) {
        await this.latency.measure("discovery", async () => {
          // Simulate connector parsing + mapping
          JSON.parse(JSON.stringify(product));
        });
      }
    });
    this.memory.capture();

    // ── Stage 2: Normalization ─────────────────────────────
    console.log("\n── Stage 2: Normalization ──");
    this.memory.capture();
    const normalizer = new DefaultProductNormalizer(DefaultNormalizerVersions);
    const normalizedRecords: any[] = [];

    await this.throughput.measure("normalization", this.config.productCount, async () => {
      for (const product of products) {
        const raw = {
          id: `raw_${product.externalId}` as any,
          executionId: "bench" as any,
          providerCode: product.marketplace,
          externalId: product.externalId,
          payload: new TextEncoder().encode(JSON.stringify(product)),
          payloadHash: `ph_${product.externalId}`,
          discoveredAt: new Date(),
          partitionKey: `${product.marketplace}|US|2025-07-14`,
          versions: { schemaVersion: "1.0.0", workflowVersion: "1.0.0", plannerVersion: "1.0.0", providerVersion: "1.0.0", connectorVersion: "2.0.0", providerManifestVersion: "v1" } as any,
        };
        const normalized = await this.latency.measure("normalization", () =>
          normalizer.normalize(raw, product)
        );
        normalizedRecords.push(normalized);
      }
    });
    this.memory.capture();

    // ── Stage 3: AI Evaluation (if not skipped) ────────────
    if (!this.config.skipAI) {
      console.log("\n── Stage 3: AI Evaluation ──");
      this.memory.capture();

      // Use StubInferenceProvider for deterministic benchmarks
      // (real OpenAI calls would be slow and cost real money)
      const provider = new StubInferenceProvider();
      const decisionProvider = new DefaultDecisionProvider();
      const policyEngine = new DefaultPolicyEngine();

      await this.throughput.measure("evaluation", this.config.productCount, async () => {
        for (let i = 0; i < normalizedRecords.length; i++) {
          const normalized = normalizedRecords[i]!;
          // Build a minimal CanonicalProduct from the NormalizedProductRecord
          const canonicalProduct = {
            id: `canon_${i}` as any,
            identityId: `ident_${i}` as any,
            clusterId: `cluster_${i}` as any,
            title: normalized.normalizedTitle,
            brand: normalized.normalizedBrand,
            canonicalBrandId: normalized.canonicalBrandId,
            category: normalized.normalizedCategory,
            canonicalCategoryId: normalized.canonicalCategoryId,
            attributes: normalized.normalizedAttributes.map((a: any) => ({
              name: a.name, value: a.value, confidence: a.confidence, sourceProductId: a.sourceProductId
            })),
            images: normalized.normalizedImages.map((img: any) => ({
              url: img.url, fingerprint: img.fingerprint, sourceProductId: normalized.rawProductId
            })),
            priceRange: {
              min: normalized.normalizedPrice,
              max: normalized.normalizedPrice,
              currency: normalized.normalizedPrice.currency,
            },
            offerCount: 1,
            supplierCodes: [normalized.providerCode],
            primaryProductId: normalized.rawProductId,
            builtAt: new Date(),
            schemaVersion: "1.0.0",
          };

          const artifact = await this.latency.measure("evaluation", () =>
            provider.infer(canonicalProduct)
          );
          const evalResult = decisionProvider.decide(artifact, canonicalProduct);
          policyEngine.evaluate(evalResult);

          // Record cost (using stub token counts)
          this.cost.recordEvaluation(artifact.inputTokens, artifact.outputTokens);
        }
      });
      this.memory.capture();
    }

    // ── Build report ───────────────────────────────────────
    const totalDurationMs = Date.now() - totalStart;
    const completedAt = new Date().toISOString();

    const reportWithoutSummary: Omit<BenchmarkReport, "summary"> = {
      startedAt,
      completedAt,
      totalDurationMs,
      productCount: this.config.productCount,
      throughput: this.throughput.getResults(),
      latency: this.latency.getResults(),
      cost: !this.config.skipAI ? this.cost.getResult() : undefined,
      memory: this.memory.getSnapshots(),
    };

    const summary = buildSummary(reportWithoutSummary);
    const report: BenchmarkReport = { ...reportWithoutSummary, summary };

    // Print cost + memory reports
    if (!this.config.skipAI) this.cost.printReport();
    this.memory.printReport();

    return report;
  }
}
