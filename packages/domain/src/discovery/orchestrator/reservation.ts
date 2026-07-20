/**
 * @workspace/domain/discovery/orchestrator/reservation
 *
 * BudgetReservationService (A2.2 — refined).
 *
 * R4: Reservation returns a one-time-use ReservationToken that Workers
 *     consume via consume(token, actualCallsUsed). Tokens prevent
 *     double-debiting and decouple reserve-time from consume-time.
 *
 * Reservation is a soft hold. Real budget consumption happens at consume().
 * The reservation exists to prevent the orchestrator from over-scheduling.
 */
import type { BudgetReservationService } from "./interfaces";
import type {
  ExecutionContext,
  ExecutionKey,
  ReservationResult,
  ReservationToken,
  ConsumeResult,
  ReservationTokenValue
} from "./types";
import { asReservationTokenValue } from "./types";
import type { ImmutableDiscoveryPlan } from "../planner";
import type { DiscoveryBudget } from "../types";

interface ReservationEntry {
  readonly token: ReservationToken;
  readonly planId: string;
  readonly reservedCalls: number;
  reservedAt: Date;
  perSource: Readonly<Record<string, number>>;
  perRegion: Readonly<Record<string, number>>;
  /** Mutable — flips to true after consume(). */
  consumed: boolean;
  consumedCalls: number;
}

class InMemoryBudgetReservationService implements BudgetReservationService {
  private readonly entries = new Map<string, ReservationEntry>();

  reserve(
    plan: ImmutableDiscoveryPlan,
    ctx: ExecutionContext,
    key: ExecutionKey
  ): ReservationResult {
    // 1. Idempotency: same executionKey returns the existing token
    const existing = this.entries.get(key.value);
    if (existing) {
      return {
        ok: true,
        code: "ALREADY_RESERVED",
        reservedCalls: existing.reservedCalls,
        remainingCalls: this.computeRemaining(ctx.planner.budget, existing.reservedCalls),
        token: this.snapshotToken(existing),
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

    // 3. Create token + entry
    const now = (ctx.now ?? (() => new Date()))();
    const tokenValue = this.makeTokenValue(key, now);
    const entry: ReservationEntry = {
      token: {
        value: tokenValue,
        executionKey: key,
        planId: plan.id,
        reservedCalls: requested,
        consumed: false,
        consumedCalls: 0,
        createdAt: now
      },
      planId: plan.id,
      reservedCalls: requested,
      reservedAt: now,
      perSource: { ...plan.budget.perSource },
      perRegion: { ...plan.budget.perRegion },
      consumed: false,
      consumedCalls: 0
    };
    this.entries.set(key.value, entry);

    return {
      ok: true,
      code: "RESERVED",
      reservedCalls: requested,
      remainingCalls: remaining - requested,
      token: this.snapshotToken(entry),
      message: `Reserved ${requested} API calls for plan ${plan.id}`
    };
  }

  consume(token: ReservationToken, actualCallsUsed: number): ConsumeResult {
    // 1. Lookup by executionKey (the token is just a credential;
    //    the source of truth is the entry keyed by executionKey.value)
    const entry = this.entries.get(token.executionKey.value);
    if (!entry) {
      return {
        ok: false,
        code: "TOKEN_INVALID",
        callsDebited: 0,
        overage: 0,
        message: "No reservation found for this token's executionKey"
      };
    }

    // 2. Verify token value matches (prevents forged tokens)
    if (entry.token.value !== token.value) {
      return {
        ok: false,
        code: "TOKEN_INVALID",
        callsDebited: 0,
        overage: 0,
        message: "Token value does not match reservation"
      };
    }

    // 3. Check expiry
    if (entry.token.expiresAt && entry.token.expiresAt.getTime() < Date.now()) {
      return {
        ok: false,
        code: "TOKEN_EXPIRED",
        callsDebited: 0,
        overage: 0,
        message: "Token has expired"
      };
    }

    // 4. Check double-consume
    if (entry.consumed) {
      return {
        ok: false,
        code: "TOKEN_CONSUMED",
        callsDebited: entry.consumedCalls,
        overage: 0,
        message: "Token has already been consumed"
      };
    }

    // 5. Consume — debit actual calls, flag as consumed
    entry.consumed = true;
    entry.consumedCalls = actualCallsUsed;
    const overage = Math.max(0, actualCallsUsed - entry.reservedCalls);

    return {
      ok: true,
      code: "RESERVED",
      callsDebited: actualCallsUsed,
      overage,
      message:
        overage > 0
          ? `Consumed ${actualCallsUsed} calls (overage: ${overage})`
          : `Consumed ${actualCallsUsed} calls`
    };
  }

  release(key: ExecutionKey): { released: boolean; releasedCalls: number } {
    const entry = this.entries.get(key.value);
    if (!entry) return { released: false, releasedCalls: 0 };
    const releasedCalls = entry.consumed ? entry.consumedCalls : entry.reservedCalls;
    this.entries.delete(key.value);
    return { released: true, releasedCalls };
  }

  inspect(key: ExecutionKey): {
    exists: boolean;
    reservedCalls: number;
    consumed: boolean;
    consumedCalls: number;
    reservedAt?: Date;
    planId?: string;
    token?: ReservationToken;
  } {
    const e = this.entries.get(key.value);
    if (!e)
      return {
        exists: false,
        reservedCalls: 0,
        consumed: false,
        consumedCalls: 0
      };
    return {
      exists: true,
      reservedCalls: e.reservedCalls,
      consumed: e.consumed,
      consumedCalls: e.consumedCalls,
      reservedAt: e.reservedAt,
      planId: e.planId,
      token: this.snapshotToken(e)
    };
  }

  /** Build a fresh immutable snapshot of the token from the entry. */
  private snapshotToken(entry: ReservationEntry): ReservationToken {
    return {
      value: entry.token.value,
      executionKey: entry.token.executionKey,
      planId: entry.token.planId,
      reservedCalls: entry.token.reservedCalls,
      consumed: entry.consumed,
      consumedCalls: entry.consumedCalls,
      createdAt: entry.token.createdAt,
      expiresAt: entry.token.expiresAt
    };
  }

  /** Deterministic token value derived from executionKey + timestamp. */
  private makeTokenValue(key: ExecutionKey, now: Date): ReservationTokenValue {
    const raw = `rt_${key.value}_${now.getTime()}`;
    return asReservationTokenValue(raw);
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
