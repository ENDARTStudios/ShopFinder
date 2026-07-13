/**
 * @workspace/domain/discovery/orchestrator/execution-registry
 *
 * In-memory ExecutionRegistry. Idempotent: same executionKey always
 * returns the same job set. Production should swap in a Redis or DB
 * implementation behind the same interface for cross-process safety.
 *
 * The registry is the single source of truth for "has this plan been
 * scheduled?". The Orchestrator consults it before reserving budget.
 */
import type { ExecutionRegistry } from "./interfaces";
import type { ExecutionKey, PlanLifecycleState } from "./types";
import type { DiscoveryJob } from "../types";

interface RegistryEntry {
  readonly key: ExecutionKey;
  readonly jobs: ReadonlyArray<DiscoveryJob>;
  readonly registeredAt: Date;
  state: PlanLifecycleState;
}

class InMemoryExecutionRegistry implements ExecutionRegistry {
  private readonly entries = new Map<string, RegistryEntry>();

  register(key: ExecutionKey, jobs: ReadonlyArray<DiscoveryJob>): boolean {
    const existing = this.entries.get(key.value);
    if (existing) return false; // idempotent: already registered
    this.entries.set(key.value, {
      key,
      jobs: [...jobs],
      registeredAt: new Date(),
      state: "scheduled"
    });
    return true;
  }

  lookup(key: ExecutionKey): {
    exists: boolean;
    jobs: ReadonlyArray<DiscoveryJob>;
    registeredAt?: Date;
    state?: PlanLifecycleState;
  } {
    const e = this.entries.get(key.value);
    if (!e) return { exists: false, jobs: [] };
    return {
      exists: true,
      jobs: e.jobs,
      registeredAt: e.registeredAt,
      state: e.state
    };
  }

  markState(key: ExecutionKey, state: PlanLifecycleState): boolean {
    const e = this.entries.get(key.value);
    if (!e) return false;
    e.state = state;
    return true;
  }

  clear(): void {
    this.entries.clear();
  }

  /** Test helper: number of entries. */
  get size(): number {
    return this.entries.size;
  }
}

let _instance: InMemoryExecutionRegistry | null = null;

export function getExecutionRegistry(): ExecutionRegistry {
  if (!_instance) _instance = new InMemoryExecutionRegistry();
  return _instance;
}

export function resetExecutionRegistry(): ExecutionRegistry {
  _instance = new InMemoryExecutionRegistry();
  return _instance;
}

export function createExecutionRegistry(): ExecutionRegistry {
  return new InMemoryExecutionRegistry();
}
