/**
 * @workspace/infrastructure/benchmarks/stats
 *
 * Statistical helpers for benchmark analysis.
 */

export function computeLatencyStats(samples: ReadonlyArray<number>): import("./types").LatencyStats {
  if (samples.length === 0) {
    return { avg: 0, p50: 0, p95: 0, p99: 0, max: 0, samples: 0 };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const avg = sum / sorted.length;
  const max = sorted[sorted.length - 1]!;

  return {
    avg: Math.round(avg * 100) / 100,
    p50: percentile(sorted, 0.50),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: Math.round(max * 100) / 100,
    samples: sorted.length,
  };
}

function percentile(sorted: ReadonlyArray<number>, p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;

  const idx = Math.ceil(p * sorted.length) - 1;
  const clamped = Math.max(0, Math.min(sorted.length - 1, idx));
  return Math.round(sorted[clamped]! * 100) / 100;
}

export function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatProductsPerSecond(pps: number): string {
  if (pps < 1) return `${(pps * 60).toFixed(1)}/min`;
  if (pps < 1000) return `${pps.toFixed(1)}/s`;
  return `${(pps / 1000).toFixed(2)}k/s`;
}

export function formatMoney(amount: number, currency: string = "USD"): string {
  return `$${(amount / 100).toFixed(4)} ${currency}`;
}

export function formatMB(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(1)}MB`;
  return `${(mb / 1024).toFixed(2)}GB`;
}
