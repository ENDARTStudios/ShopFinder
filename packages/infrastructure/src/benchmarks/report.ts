/**
 * @workspace/infrastructure/benchmarks/report
 *
 * Generates formatted benchmark reports.
 */
import type { BenchmarkReport, BenchmarkSummary } from "./types";
import { formatMs, formatProductsPerSecond, formatMoney, formatMB } from "./stats";

export function formatReport(report: BenchmarkReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push("╔══════════════════════════════════════════════════════════════╗");
  lines.push("║                  ShopFinder — Benchmark Report               ║");
  lines.push("╚══════════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`Products: ${report.productCount.toLocaleString()}`);
  lines.push(`Duration: ${formatMs(report.totalDurationMs)}`);
  lines.push(`Date: ${report.startedAt}`);
  lines.push("");

  // Throughput
  lines.push("── Throughput ──────────────────────────────────────");
  for (const t of report.throughput) {
    lines.push(`  ${t.stage.padEnd(20)} ${formatProductsPerSecond(t.productsPerSecond).padStart(12)}   (${formatMs(t.durationMs)})`);
  }
  lines.push("");

  // Latency
  lines.push("── Latency per Stage ───────────────────────────────");
  lines.push(`  ${"Stage".padEnd(20)} ${"avg".padStart(8)} ${"p50".padStart(8)} ${"p95".padStart(8)} ${"p99".padStart(8)} ${"max".padStart(8)}`);
  for (const l of report.latency) {
    lines.push(
      `  ${l.stage.padEnd(20)} ${formatMs(l.stats.avg).padStart(8)} ${formatMs(l.stats.p50).padStart(8)} ${formatMs(l.stats.p95).padStart(8)} ${formatMs(l.stats.p99).padStart(8)} ${formatMs(l.stats.max).padStart(8)}`
    );
  }
  lines.push("");

  // Cost
  if (report.cost) {
    lines.push("── AI Cost ─────────────────────────────────────────");
    lines.push(`  Model: ${report.cost.model}`);
    lines.push(`  Products evaluated: ${report.cost.productsEvaluated.toLocaleString()}`);
    lines.push(`  Input tokens: ${report.cost.totalInputTokens.toLocaleString()}`);
    lines.push(`  Output tokens: ${report.cost.totalOutputTokens.toLocaleString()}`);
    lines.push(`  Total cost: ${formatMoney(report.cost.totalCost.amount, report.cost.totalCost.currency)}`);
    lines.push(`  Cost per product: ${formatMoney(report.cost.costPerProduct.amount, report.cost.costPerProduct.currency)}`);
    lines.push(`  Cost per 1k products: ${formatMoney(report.cost.costPer1kProducts.amount, report.cost.costPer1kProducts.currency)}`);
    lines.push("");
  }

  // Memory
  if (report.memory.length > 0) {
    lines.push("── Memory ──────────────────────────────────────────");
    lines.push(`  Peak heap: ${formatMB(report.summary.peakMemoryMB)}`);
    const latest = report.memory[report.memory.length - 1];
    if (latest) {
      lines.push(`  Final heap: ${formatMB(latest.heapUsedMB)}`);
      lines.push(`  RSS: ${formatMB(latest.rssMB)}`);
    }
    lines.push("");
  }

  // Summary
  lines.push("── Summary ─────────────────────────────────────────");
  lines.push(`  Products processed: ${report.summary.totalProductsProcessed.toLocaleString()}`);
  lines.push(`  End-to-end: ${formatMs(report.summary.endToEndMsPerProduct)}/product`);
  lines.push(`  Overall throughput: ${formatProductsPerSecond(report.summary.overallThroughput)}`);
  if (report.summary.costPerProduct) {
    lines.push(`  Cost per product: ${formatMoney(report.summary.costPerProduct.amount, report.summary.costPerProduct.currency)}`);
  }
  lines.push(`  Peak memory: ${formatMB(report.summary.peakMemoryMB)}`);
  lines.push(`  Bottleneck: ${report.summary.bottleneck}`);
  lines.push("");
  lines.push("────────────────────────────────────────────────────");

  return lines.join("\n");
}

export function reportToJson(report: BenchmarkReport): string {
  return JSON.stringify(report, null, 2);
}

export function buildSummary(
  report: Omit<BenchmarkReport, "summary">
): BenchmarkSummary {
  const totalProducts = report.productCount;
  const totalMs = report.totalDurationMs;
  const endToEndMsPerProduct = totalProducts > 0 ? totalMs / totalProducts : 0;
  const overallThroughput = totalMs > 0 ? (totalProducts / (totalMs / 1000)) : 0;

  // Find bottleneck (slowest stage by avg latency)
  let bottleneck = "unknown";
  let maxAvg = 0;
  for (const l of report.latency) {
    if (l.stats.avg > maxAvg) {
      maxAvg = l.stats.avg;
      bottleneck = l.stage;
    }
  }

  const peakMemoryMB = report.memory.length > 0
    ? Math.max(...report.memory.map(m => m.heapUsedMB))
    : 0;

  return {
    totalProductsProcessed: totalProducts,
    endToEndMsPerProduct: Math.round(endToEndMsPerProduct * 100) / 100,
    overallThroughput: Math.round(overallThroughput * 100) / 100,
    costPerProduct: report.cost?.costPerProduct,
    peakMemoryMB: Math.round(peakMemoryMB * 100) / 100,
    bottleneck,
  };
}
