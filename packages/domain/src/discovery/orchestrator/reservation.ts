/**
 * @workspace/domain/discovery/orchestrator/reservation
 *
 * BudgetReservationService. Idempotent: same executionKey returns
 * ALREADY_RESERVED with the original allocation. Does NOT debit the
 * real budget — that happens when workers complete jobs (A2.3).
 *
 * Reservation is a soft hold. Real budget consumption is tracked by
 * the workers when they actually call providers. The reservation
 * exists to prevent the orchestrator from over-scheduling.
 */
import type { BudgetReservationService } from "./interfaces";
import type { ExecutionContext, ExecutionKey, ReservationResult } from "./types";
import type { ImmutableDiscoveryPlan } from "../planner";
import type { DiscoveryBudget } from "../types";

interface ReservationEntry {
  readonly key: ExecutionKey;
  readonly planId: string;
  readonly reservedCalls: number;
  readonly reservedAt: Date;
  readonly perSource: Readonly<Record<string, number>>;
  readonly perRegion: Readonly<Record<string, number>>;
}

class InMemoryBudgetReservationService implements BudgetReservationService {
  private readonly entries = new Map<string, ReservationEntry>();

  reserve(
    plan: ImmutableDiscoveryPlan,
    ctx: ExecutionContext,
    key: ExecutionKey
  ): ReservationResult {
    // 1. Idempotency: same executionKey returns the original reservation
    const existing = this.entries.get(key.value);
    if (existing) {
      return {
        ok: true,
        code: "ALREADY_RESERVED",
        reservedCalls: existing.reservedCalls,
        remainingCalls: this.computeRemaining(ctx.planner.budget, existing.reservedCalls),
        message: "Reservation already exists for this executionKey"
      };
    }

    // 2. Insufficient budget check
    const budget = ctx.planner.budget;
    const requested = plan.budget.totalApiCalls;
    const remaining = this.computeRemaining(budget, 0);

    if (requested > remaining) {
      return {
        ok: false,
        code: "INSUFFICIENT_BUDGET",
        reservedCalls: 0,
        remainingCalls: remaining,
        message: `Requested ${requested} calls but only ${remaining} remaining`
      };
    }

    // 3. Create reservation
    const entry: ReservationEntry = {
      key,
      planId: plan.id,
      reservedCalls: requested,
      reservedAt: (ctx.now ?? (() => new Date()))(),
      perSource: { ...plan.budget.perSource },
      perRegion: { ...plan.budget.perRegion }
    };
    this.entries.set(key.value, entry);

    return {
      ok: true,
      code: "RESERVED",
      reservedCalls: requested,
      remainingCalls: remaining - requested,
      message: `Reserved ${requested} API calls for plan ${plan.id}`
    };
  }

  release(key: ExecutionKey): { released: boolean; releasedCalls: number } {
    const entry = this.entries.get(key.value);
    if (!entry) return { released: false, releasedCalls: 0 };
    this.entries.delete(key.value);
    return { released: true, releasedCalls: entry.reservedCalls };
  }

  inspect(key: ExecutionKey): {
    exists: boolean;
    reservedCalls: number;
    reservedAt?: Date;
    planId?: string;
  } {
    const e = this.entries.get(key.value);
    if (!e) return { exists: false, reservedCalls: 0 };
    return {
      exists: true,
      reservedCalls: e.reservedCalls,
      reservedAt: e.reservedAt,
      planId: e.planId
    };
  }

  private computeRemaining(budget: DiscoveryBudget, alreadyReserved: number): number {
    const used = budget.currentUsage.apiCallsUsed + alreadyReserved;
    return Math.max(0, budget.maxApiCalls - used);
  }

  /** Test helper. */
  get size(): number {
    return this.entries.size;
  }
}

let _instance: InMemoryBudgetReservationService | null = null;

export function getBudgetReservationService(): BudgetReservationService {
  if (!_instance) _instance = new InMemoryBudgetReservationService();
  return _instance;
}

export function resetBudgetReservationService(): BudgetReservationService {
  _instance = new InMemoryBudgetReservationService();
  return _instance;
}

export function createBudgetReservationService(): BudgetReservationService {
  return new InMemoryBudgetReservationService();
}
