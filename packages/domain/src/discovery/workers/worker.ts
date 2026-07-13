/**
 * @workspace/domain/discovery/workers/worker
 *
 * DiscoveryWorker — the A2.3 coordinator that consumes a DiscoveryJob
 * and produces NormalizedDiscoveredProduct[] + events.
 *
 * Flow:
 *   1. markState(executionKey, "executing") + emit ExecutionStarted
 *   2. load checkpoint (resume from last cursor if present)
 *   3. loop:
 *      a. select provider
 *      b. executor.fetch() with retry/timeout/rate-limit
 *      c. accumulate products
 *      d. save checkpoint every N items
 *      e. continue if hasMore and not cancelled and under maxItems
 *   4. consume reservation token with actual apiCallsUsed
 *   5. markState(executionKey, "completed") + emit ExecutionCompleted
 *   6. on failure: emit ExecutionFailed + return failed result
 *   7. on cancellation: emit ExecutionFailed (retriable=false) + return cancelled result
 *
 * Worker does NOT:
 *   - normalize attributes (A2.5)
 *   - deduplicate (A2.6)
 *   - evaluate AI (A2.7)
 *   - publish catalog (A2.9)
 *   - call the Planner (A2.1)
 *   - access the catalog repository
 */
import type {
  WorkerContext,
  WorkerResult,
  WorkerError,
  DiscoveryJob,
  ConnectorDiscoverResult
} from "./types";
import { JobExecutor } from "./executor";
import { buildCheckpoint } from "./checkpoint";
import { completed, failed, cancelled, WorkerErrors } from "./result";
import { emitExecutionStarted, emitExecutionCompleted, emitExecutionFailed } from "./events";

/**
 * DiscoveryWorker — stateless coordinator. All state lives in
 * WorkerContext (per-execute) and the injected services.
 */
export class DiscoveryWorker {
  async execute(job: DiscoveryJob, ctx: WorkerContext): Promise<WorkerResult> {
    const totalTimer = ctx.metrics.startTimer("total");
    ctx.metrics.reset();

    const versions = {
      workflowVersion: ctx.workflowVersion,
      plannerVersion: ctx.plannerVersion
    };

    // 1. Mark executing + emit Started
    ctx.executionRegistry.markState(ctx.executionKey, "executing");
    await ctx.events.publish([
      emitExecutionStarted(versions, {
        planId: job.parentPlanId,
        executionKey: ctx.executionKey.value,
        jobId: job.id,
        workerId: ctx.workerId,
        startedAt: (ctx.now ?? (() => new Date()))().toISOString()
      })
    ]);

    // 2. Load checkpoint
    let checkpoint = await ctx.checkpointStore.load(job.id);
    let cursor = checkpoint?.cursor;
    let page = checkpoint?.page ?? 0;
    let itemsProcessed = checkpoint?.itemsProcessed ?? 0;
    let totalApiCalls = 0;
    let attempts = 0;
    let connectorSelected: { providerCode: string } | null = null;
    // Accumulate products for A2.4 RawStoreCoordinator consumption
    const allProducts: import("./types").NormalizedDiscoveredProduct[] = [];

    try {
      // 3. Select provider
      const { connector } = ctx.providerSelector.select(job, ctx.connectors);
      connectorSelected = { providerCode: connector.providerCode };

      // 4. Paging loop
      let hasMore = true;
      let lastResult: ConnectorDiscoverResult | null = null;

      while (hasMore && !ctx.cancellationSignal.cancelled) {
        if (itemsProcessed >= ctx.config.maxItemsPerJob) {
          // Safety cap reached — stop, but report as completed
          break;
        }

        // 4a. Executor fetch with retry/timeout/rate-limit
        let fetchResult;
        try {
          fetchResult = await ctx.executor.fetch(
            job,
            connector,
            {
              category: job.category,
              keyword: job.keyword,
              region: job.region,
              language: job.language,
              cursor,
              limit: ctx.config.checkpointInterval
            },
            ctx.cancellationSignal
          );
        } catch (e) {
          // Track attempts even on failure — the executor attaches
          // its internal attempt count to the thrown error.
          const errAtt = (e as { attempts?: number }).attempts;
          if (typeof errAtt === "number") attempts = errAtt;
          else attempts = Math.max(attempts, 1);
          throw e;
        }
        attempts = fetchResult.attempts;
        totalApiCalls += fetchResult.apiCallsUsed;
        ctx.metrics.setGauge("apiCallsUsed", totalApiCalls);
        ctx.metrics.increment("itemsProcessed", fetchResult.result.products.length);
        itemsProcessed += fetchResult.result.products.length;
        // Accumulate products for A2.4 RawStoreCoordinator
        allProducts.push(...fetchResult.result.products);
        lastResult = fetchResult.result;

        // Safety cap: stop if we've reached or exceeded maxItemsPerJob
        if (itemsProcessed >= ctx.config.maxItemsPerJob) {
          hasMore = false;
        }

        // 4b. Checkpoint
        page += 1;
        cursor = fetchResult.result.nextCursor;
        const cpTimer = ctx.metrics.startTimer("checkpoint");
        const newCheckpoint = buildCheckpoint({
          jobId: job.id,
          providerCode: connector.providerCode,
          cursor: cursor ?? "",
          page,
          itemsProcessed,
          now: (ctx.now ?? (() => new Date()))()
        });
        await ctx.checkpointStore.save(newCheckpoint);
        ctx.metrics.increment("checkpointsSaved");
        checkpoint = newCheckpoint;
        cpTimer();

        hasMore = fetchResult.result.hasMore && !!fetchResult.result.nextCursor;
      }

      // 5. Cancellation check (post-loop)
      if (ctx.cancellationSignal.cancelled) {
        return await this.handleCancellation(
          job,
          ctx,
          connectorSelected?.providerCode ?? "unknown",
          attempts,
          totalApiCalls,
          totalTimer,
          versions
        );
      }

      // 6. Consume reservation token
      let reservationConsumed = false;
      if (ctx.reservationToken) {
        const consumeResult = ctx.reservationService.consume(ctx.reservationToken, totalApiCalls);
        reservationConsumed = consumeResult.ok;
      }

      // 7. Mark completed + emit Completed
      ctx.executionRegistry.markState(ctx.executionKey, "completed");
      await ctx.events.publish([
        emitExecutionCompleted(versions, {
          planId: job.parentPlanId,
          executionKey: ctx.executionKey.value,
          jobId: job.id,
          workerId: ctx.workerId,
          productsDiscovered: itemsProcessed,
          productsNormalized: itemsProcessed,
          durationMs: totalTimer(),
          apiCallsUsed: totalApiCalls,
          nextCursor: lastResult?.nextCursor,
          hasMore: lastResult?.hasMore ?? false
        })
      ]);

      return completed({
        jobId: job.id,
        providerCode: connector.providerCode,
        productsDiscovered: itemsProcessed,
        products: allProducts,
        nextCursor: lastResult?.nextCursor,
        hasMore: lastResult?.hasMore ?? false,
        attempts,
        durationMs: totalTimer(),
        apiCallsUsed: totalApiCalls,
        reservationConsumed,
        metrics: ctx.metrics.snapshot()
      });
    } catch (e) {
      // Detect cancellation errors and route to handleCancellation
      const isCancellation =
        ctx.cancellationSignal.cancelled ||
        (e && typeof e === "object" && "code" in e && (e as WorkerError).code === "CANCELLED");
      if (isCancellation) {
        return await this.handleCancellation(
          job,
          ctx,
          connectorSelected?.providerCode ?? "unknown",
          attempts,
          totalApiCalls,
          totalTimer,
          versions
        );
      }
      return await this.handleFailure(
        job,
        ctx,
        e,
        connectorSelected?.providerCode ?? "unknown",
        attempts,
        totalApiCalls,
        totalTimer,
        versions
      );
    }
  }

  private async handleFailure(
    job: DiscoveryJob,
    ctx: WorkerContext,
    error: unknown,
    providerCode: string,
    attempts: number,
    apiCallsUsed: number,
    totalTimer: () => number,
    versions: { workflowVersion: string; plannerVersion: string }
  ): Promise<WorkerResult> {
    const workerError: WorkerError =
      error && typeof error === "object" && "code" in error
        ? (error as WorkerError)
        : WorkerErrors.unknown(error);

    // Try to consume token for the calls we did make
    let reservationConsumed = false;
    if (ctx.reservationToken && apiCallsUsed > 0) {
      const r = ctx.reservationService.consume(ctx.reservationToken, apiCallsUsed);
      reservationConsumed = r.ok;
    }

    ctx.executionRegistry.markState(ctx.executionKey, "failed");
    await ctx.events.publish([
      emitExecutionFailed(versions, {
        planId: job.parentPlanId,
        executionKey: ctx.executionKey.value,
        jobId: job.id,
        workerId: ctx.workerId,
        error: workerError.message,
        errorCode: workerError.code,
        retriable: workerError.retriable,
        attempt: attempts
      })
    ]);

    return failed({
      jobId: job.id,
      providerCode,
      attempts,
      durationMs: totalTimer(),
      apiCallsUsed,
      reservationConsumed,
      error: workerError,
      metrics: ctx.metrics.snapshot()
    });
  }

  private async handleCancellation(
    job: DiscoveryJob,
    ctx: WorkerContext,
    providerCode: string,
    attempts: number,
    apiCallsUsed: number,
    totalTimer: () => number,
    versions: { workflowVersion: string; plannerVersion: string }
  ): Promise<WorkerResult> {
    ctx.executionRegistry.markState(ctx.executionKey, "cancelled");
    await ctx.events.publish([
      emitExecutionFailed(versions, {
        planId: job.parentPlanId,
        executionKey: ctx.executionKey.value,
        jobId: job.id,
        workerId: ctx.workerId,
        error: ctx.cancellationSignal.reason ?? "Cancellation requested",
        errorCode: "CANCELLED",
        retriable: false,
        attempt: attempts
      })
    ]);

    return cancelled({
      jobId: job.id,
      providerCode,
      attempts,
      durationMs: totalTimer(),
      apiCallsUsed,
      reservationConsumed: false,
      reason: ctx.cancellationSignal.reason ?? "Cancellation requested",
      metrics: ctx.metrics.snapshot()
    });
  }
}

/**
 * Build a default Worker. Stateless — pass a fresh WorkerContext per execute().
 */
export function createWorker(): DiscoveryWorker {
  return new DiscoveryWorker();
}

/**
 * Build a cancellation signal that can be triggered externally.
 */
export function createCancellationSignal(
  initialReason?: string
): import("./types").CancellationSignal {
  let cancelled = false;
  let reason = initialReason;
  const handlers: Array<() => void> = [];
  return {
    get cancelled() {
      return cancelled;
    },
    get reason() {
      return reason;
    },
    onCancel(handler: () => void) {
      handlers.push(handler);
    },
    cancel(r?: string) {
      if (cancelled) return;
      cancelled = true;
      if (r) reason = r;
      for (const h of handlers) {
        try {
          h();
        } catch {
          /* ignore handler errors */
        }
      }
    }
  };
}

/**
 * Build a WorkerId from a raw string.
 */
export function asWorkerId(v: string): import("./types").WorkerId {
  return v as unknown as import("./types").WorkerId;
}

/**
 * Build a JobExecutor with the given deps.
 */
export function createExecutor(deps: import("./executor").ExecutorDeps): JobExecutor {
  return new JobExecutor(deps);
}
