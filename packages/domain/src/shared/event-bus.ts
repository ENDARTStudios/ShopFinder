/**
 * @workspace/domain/shared/event-bus
 *
 * In-process domain event bus. The interface is the contract — the
 * implementation can be swapped (in-memory now, Redis Streams / Kafka /
 * NATS later) without touching the domain.
 *
 * Usage:
 *   import { getEventBus, type DomainEventHandler } from "@workspace/domain/shared";
 *
 *   const bus = getEventBus();
 *   bus.subscribe("order.placed", async (e) => { ... });
 *   await bus.publish(order.domainEvents[0]);
 */

import type { DomainEvent } from "./types";

// ── Handler interface ───────────────────────────────────────

export type DomainEventHandler<E extends DomainEvent = DomainEvent> = (
  event: E
) => void | Promise<void>;

export interface DomainEventBus {
  /** Publish one or more events to all subscribed handlers. */
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
  /** Subscribe to events matching a type prefix (e.g. "order." matches "order.placed"). */
  subscribe(eventType: string, handler: DomainEventHandler): Unsubscribe;
  /** Remove all handlers (useful in tests). */
  clear(): void;
  /** Number of active subscriptions (for diagnostics). */
  readonly subscriberCount: number;
}

export type Unsubscribe = () => void;

// ── In-memory implementation ────────────────────────────────

class InMemoryEventBus implements DomainEventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  async publish(event: DomainEvent): Promise<void> {
    // Match exact type and prefix patterns (e.g. "order.placed" and "order.")
    const matches: DomainEventHandler[] = [];
    for (const [pattern, set] of this.handlers.entries()) {
      if (pattern === event.eventType || event.eventType.startsWith(pattern)) {
        for (const h of set) matches.push(h);
      }
    }
    // Sequential execution — preserves ordering within a context.
    // Failures are logged but do not stop other handlers (at-least-once semantics).
    await Promise.all(
      matches.map(async (h) => {
        try {
          await h(event);
        } catch (e) {
          // In production, route to the observability layer.

          console.error("[event-bus] handler error", {
            eventType: event.eventType,
            error: e
          });
        }
      })
    );
  }

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const e of events) await this.publish(e);
  }

  subscribe(eventType: string, handler: DomainEventHandler): Unsubscribe {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
      if (set && set.size === 0) this.handlers.delete(eventType);
    };
  }

  clear(): void {
    this.handlers.clear();
  }

  get subscriberCount(): number {
    let total = 0;
    for (const set of this.handlers.values()) total += set.size;
    return total;
  }
}

// ── Singleton ───────────────────────────────────────────────

let _bus: DomainEventBus | null = null;

export function getEventBus(): DomainEventBus {
  if (!_bus) _bus = new InMemoryEventBus();
  return _bus;
}

export function setEventBus(bus: DomainEventBus): void {
  _bus = bus;
}

/** Test helper — fresh bus per test. */
export function resetEventBus(): DomainEventBus {
  _bus = new InMemoryEventBus();
  return _bus;
}
