/**
 * @workspace/events — Outbox event consumers
 */
import type { DomainEvent, DomainEventBus } from "@workspace/domain/shared";

export interface EventConsumer {
  readonly eventType: string;
  handle(event: DomainEvent): Promise<void>;
}

export class ConsumerRegistry {
  private consumers = new Map<string, EventConsumer[]>();
  register(c: EventConsumer): void {
    if (!this.consumers.has(c.eventType)) this.consumers.set(c.eventType, []);
    this.consumers.get(c.eventType)!.push(c);
  }
  getConsumers(et: string): EventConsumer[] {
    return this.consumers.get(et) ?? [];
  }
  list(): Array<{ eventType: string; count: number }> {
    return [...this.consumers.entries()].map(([et, cs]) => ({ eventType: et, count: cs.length }));
  }
}

export function registerAllConsumers(bus: DomainEventBus, registry: ConsumerRegistry): void {
  for (const { eventType } of registry.list()) {
    const consumers = registry.getConsumers(eventType);
    for (const c of consumers)
      bus.subscribe(eventType, async (e) => {
        try {
          await c.handle(e);
        } catch (err) {
          console.error(`[events] ${eventType}:`, err);
        }
      });
  }
}

export function getConsumerRegistry(): ConsumerRegistry {
  return new ConsumerRegistry();
}
