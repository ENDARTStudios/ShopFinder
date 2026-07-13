/**
 * @workspace/domain/discovery/workers/executor
 *
 * JobExecutor — executes a single DiscoveryJob against a connector
 * with timeout + retry + rate limiting. Called by the Worker for
 * each job; handles a single fetch (the Worker handles paging by
 * calling executor.fetch once per page).
 *
 * Flow:
 *   1. acquire rate-limit slot
 *   2. call connector.discover() with timeout
 *   3. on failure: retry per RetryPolicy
 *   4. on success: return result + apiCallsUsed
 */
import type {
  DiscoveryConnector,
  ConnectorDiscoverInput,
  ConnectorDiscoverResult,
  CancellationSignal,
  RateLimiter,
  RetryPolicy,
  WorkerError,
  WorkerMetricsCollector,
  DiscoveryJob
} from "./types";
import { WorkerErrors } from "./result";

export interface ExecutorDeps {
  readonly rateLimiter: RateLimiter;
  readonly retryPolicy: RetryPolicy;
  readonly metrics: WorkerMetricsCollector;
  readonly timeoutMs: number;
}

export interface FetchResult {
  readonly result: ConnectorDiscoverResult;
  readonly attempts: number;
  readonly apiCallsUsed: number;
}

export class JobExecutor {
  constructor(private readonly deps: ExecutorDeps) {}

  async fetch(
    job: DiscoveryJob,
    connector: DiscoveryConnector,
    input: Omit<ConnectorDiscoverInput, "cancellationSignal" | "jobId" | "jobType">,
    cancellationSignal: CancellationSignal
  ): Promise<FetchResult> {
    let attempt = 0;
    let lastError: WorkerError | null = null;
    let totalApiCalls = 0;

    while (attempt < this.deps.retryPolicy.maxAttempts) {
      // Cooperative cancellation
      if (cancellationSignal.cancelled) {
        throw WorkerErrors.cancelled(cancellationSignal.reason);
      }

      attempt += 1;

      // 1. Acquire rate-limit slot
      const rateLimitTimer = this.deps.metrics.startTimer("rateLimit");
      let callId: import("./types").ProviderCallId | null = null;
      try {
        callId = await this.deps.rateLimiter.acquire(connector.providerCode, cancellationSignal);
      } catch (e) {
        rateLimitTimer();
        // Cancellation during rate-limit acquire
        if (cancellationSignal.cancelled) throw WorkerErrors.cancelled(cancellationSignal.reason);
        throw WorkerErrors.unknown(e);
      }
      rateLimitTimer();

      // 2. Execute with timeout
      const discoveryTimer = this.deps.metrics.startTimer("discovery");
      try {
        const result = await this.withTimeout(
          connector.discover({
            ...input,
            jobId: job.id,
            jobType: job.type,
            cancellationSignal
          }),
          this.deps.timeoutMs,
          cancellationSignal
        );
        discoveryTimer();
        this.deps.rateLimiter.release(callId);

        totalApiCalls += result.apiCallsUsed;
        this.deps.metrics.setGauge("apiCallsUsed", totalApiCalls);

        return { result, attempts: attempt, apiCallsUsed: totalApiCalls };
      } catch (e) {
        discoveryTimer();
        this.deps.rateLimiter.release(callId);

        const error = this.toWorkerError(e);
        // Attach attempt count so the worker can report it on failure
        (error as WorkerError & { attempts?: number }).attempts = attempt;
        lastError = error;

        // Non-retriable → fail fast
        if (!error.retriable) throw error;

        // Cancellation → fail fast
        if (cancellationSignal.cancelled) throw WorkerErrors.cancelled(cancellationSignal.reason);

        // Compute retry delay
        const delay = this.deps.retryPolicy.nextDelay(attempt, error);
        if (delay === null) {
          // No more retries
          throw error;
        }

        this.deps.metrics.increment("retries");

        // Wait with cancellation awareness
        const retryTimer = this.deps.metrics.startTimer("retry");
        await this.sleep(delay, cancellationSignal);
        retryTimer();
      }
    }

    throw lastError ?? WorkerErrors.unknown("Executor exhausted retries with no error captured");
  }

  /**
   * Race a promise against a timeout. Honors cancellationSignal —
   * if cancelled, rejects immediately.
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    signal: CancellationSignal
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const onTimeout = () => {
        if (settled) return;
        settled = true;
        reject(WorkerErrors.timeout(ms));
      };
      const onCancel = () => {
        if (settled) return;
        settled = true;
        reject(WorkerErrors.cancelled(signal.reason));
      };

      const timer = setTimeout(onTimeout, ms);
      signal.onCancel(onCancel);

      promise
        .then((v) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(v);
        })
        .catch((e) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(e);
        });
    });
  }

  private async sleep(ms: number, signal: CancellationSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const onCancel = () => {
        clearTimeout(timer);
        reject(WorkerErrors.cancelled(signal.reason));
      };
      const timer = setTimeout(() => {
        resolve();
      }, ms);
      signal.onCancel(onCancel);
    });
  }

  private toWorkerError(e: unknown): WorkerError {
    if (e && typeof e === "object" && "code" in e && "retriable" in e) {
      return e as WorkerError;
    }
    return WorkerErrors.unknown(e);
  }
}
