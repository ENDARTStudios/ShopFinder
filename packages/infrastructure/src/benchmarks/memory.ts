/**
 * @workspace/infrastructure/benchmarks/memory
 *
 * Captures memory snapshots during benchmark execution.
 */
import type { MemorySnapshot } from "./types";
import { formatMB } from "./stats";

export class MemoryBenchmark {
  private snapshots: MemorySnapshot[] = [];

  capture(): MemorySnapshot {
    const mem = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      externalMB: Math.round((mem.external / 1024 / 1024) * 100) / 100,
      rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      timestamp: new Date().toISOString(),
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  getSnapshots(): ReadonlyArray<MemorySnapshot> {
    return [...this.snapshots];
  }

  getPeak(): number {
    return Math.max(...this.snapshots.map(s => s.heapUsedMB), 0);
  }

  printReport(): void {
    const peak = this.getPeak();
    const latest = this.snapshots[this.snapshots.length - 1];
    console.log("\n💾 Memory:");
    console.log(`  Peak heap: ${formatMB(peak)}`);
    if (latest) {
      console.log(`  Final heap: ${formatMB(latest.heapUsedMB)}`);
      console.log(`  RSS: ${formatMB(latest.rssMB)}`);
      console.log(`  External: ${formatMB(latest.externalMB)}`);
    }
    console.log(`  Snapshots: ${this.snapshots.length}`);
  }

  reset(): void {
    this.snapshots = [];
  }
}
