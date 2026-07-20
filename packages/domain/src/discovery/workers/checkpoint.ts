/**
 * @workspace/domain/discovery/workers/checkpoint
 *
 * In-memory CheckpointStore. Suitable for tests and single-process
 * deployments. Production should swap in a DB-backed implementation.
 *
 * Checkpoints enable incremental job execution: if a Worker crashes
 * mid-fetch, the next Worker resumes from the last checkpoint instead
 * of re-fetching from page 1.
 */
import type { Checkpoint, CheckpointStore, CheckpointId } from "./types";

class InMemoryCheckpointStore implements CheckpointStore {
  private readonly byJob = new Map<string, Checkpoint[]>();

  async load(jobId: string): Promise<Checkpoint | null> {
    const list = this.byJob.get(jobId);
    if (!list || list.length === 0) return null;
    // Return the most recent checkpoint
    return list[list.length - 1]!;
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    const list = this.byJob.get(checkpoint.jobId) ?? [];
    // Idempotent: if same page already saved, no-op
    if (list.some((c) => c.page === checkpoint.page && c.cursor === checkpoint.cursor)) {
      return;
    }
    list.push(checkpoint);
    this.byJob.set(checkpoint.jobId, list);
  }

  async clear(jobId: string): Promise<void> {
    this.byJob.delete(jobId);
  }

  /** Test helper. */
  count(jobId: string): number {
    return this.byJob.get(jobId)?.length ?? 0;
  }
}

export function createCheckpointStore(): CheckpointStore {
  return new InMemoryCheckpointStore();
}

/** Build a new checkpoint from a job's current state. */
export function buildCheckpoint(params: {
  jobId: string;
  providerCode: string;
  cursor: string;
  page: number;
  itemsProcessed: number;
  now?: Date;
}): Checkpoint {
  const id = `cp_${params.jobId}_${params.page}` as unknown as CheckpointId;
  return {
    id,
    jobId: params.jobId,
    providerCode: params.providerCode,
    cursor: params.cursor,
    page: params.page,
    itemsProcessed: params.itemsProcessed,
    lastUpdatedAt: params.now ?? new Date()
  };
}
