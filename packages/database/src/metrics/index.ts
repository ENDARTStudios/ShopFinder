/**
 * @workspace/database/metrics — Repository instrumentation
 *
 * Per Rec 7 of 04B.3 feedback: instrument repositories from the start.
 * Even with a NoopMetrics initially, the interface is ready for OpenTelemetry.
 *
 * Metrics captured per repository operation:
 *   - duration: ms from start to finish
 *   - rows: number of rows returned/affected
 *   - cacheHit: whether the cache was hit
 *   - queryCount: number of DB queries executed
 */

export interface RepositoryMetrics {
  recordOperation(params: {
    repository: string;
    operation: string;
    durationMs: number;
    rows?: number;
    cacheHit?: boolean;
    queryCount?: number;
    error?: string;
  }): void;

  incrementCounter(name: string, tags?: Record<string, string>): void;
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
}

// ── No-op implementation (dev default) ──────────────────────

export class NoopRepositoryMetrics implements RepositoryMetrics {
  recordOperation(): void {
    // no-op
  }
  incrementCounter(): void {
    // no-op
  }
  recordGauge(): void {
    // no-op
  }
  recordHistogram(): void {
    // no-op
  }
}

// ── Console implementation (dev/debug) ──────────────────────

export class ConsoleRepositoryMetrics implements RepositoryMetrics {
  recordOperation(params: {
    repository: string;
    operation: string;
    durationMs: number;
    rows?: number;
    cacheHit?: boolean;
    queryCount?: number;
    error?: string;
  }): void {
    const parts = [
      `[db] ${params.repository}.${params.operation}`,
      `${params.durationMs}ms`,
      params.rows !== undefined ? `${params.rows} rows` : "",
      params.cacheHit !== undefined ? `cache:${params.cacheHit ? "hit" : "miss"}` : "",
      params.error ? `ERROR: ${params.error}` : ""
    ].filter(Boolean);
    console.log(parts.join(" | "));
  }

  incrementCounter(name: string): void {
    console.log(`[counter] ${name} +1`);
  }

  recordGauge(name: string, value: number): void {
    console.log(`[gauge] ${name} = ${value}`);
  }

  recordHistogram(name: string, value: number): void {
    console.log(`[histogram] ${name} = ${value}`);
  }
}

// ── Singleton ───────────────────────────────────────────────

let _metrics: RepositoryMetrics | null = null;

export function getRepositoryMetrics(): RepositoryMetrics {
  if (!_metrics) {
    _metrics =
      process.env.NODE_ENV === "development"
        ? new NoopRepositoryMetrics()
        : new NoopRepositoryMetrics();
  }
  return _metrics;
}

export function setRepositoryMetrics(metrics: RepositoryMetrics): void {
  _metrics = metrics;
}

// ── Timing decorator ────────────────────────────────────────

export async function withMetrics<T>(
  repository: string,
  operation: string,
  fn: () => Promise<T>,
  opts?: { cacheHit?: boolean }
): Promise<T> {
  const metrics = getRepositoryMetrics();
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    const rows = Array.isArray(result) ? result.length : result ? 1 : 0;
    metrics.recordOperation({ repository, operation, durationMs, rows, cacheHit: opts?.cacheHit });
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    metrics.recordOperation({
      repository,
      operation,
      durationMs,
      error: (error as Error).message
    });
    throw error;
  }
}
