/**
 * @workspace/jobs — Background workers
 */
import type { PrismaClient } from "@prisma/client";

export interface Job {
  readonly name: string;
  readonly schedule?: string;
  execute(ctx: JobContext): Promise<JobResult>;
}
export interface JobContext {
  readonly prisma: PrismaClient;
  readonly logger: JobLogger;
}
export interface JobLogger {
  info(m: string, c?: Record<string, unknown>): void;
  warn(m: string, c?: Record<string, unknown>): void;
  error(m: string, c?: Record<string, unknown>): void;
}
export interface JobResult {
  readonly success: boolean;
  readonly itemsProcessed: number;
  readonly itemsSucceeded: number;
  readonly itemsFailed: number;
  readonly durationMs: number;
  readonly error?: string;
}

export class JobRegistry {
  private jobs = new Map<string, Job>();
  register(j: Job): void {
    this.jobs.set(j.name, j);
  }
  get(n: string): Job | undefined {
    return this.jobs.get(n);
  }
  list(): Job[] {
    return [...this.jobs.values()];
  }
}

export const OutboxDispatcherJob: Job = {
  name: "outbox-dispatcher",
  schedule: "*/5 * * * *",
  async execute(ctx): Promise<JobResult> {
    const s = Date.now();
    let p = 0,
      ok = 0,
      fail = 0;
    const pending = await ctx.prisma.outboxEvent.findMany({
      where: { status: "pending", availableAt: { lte: new Date() } },
      take: 100,
      orderBy: { createdAt: "asc" }
    });
    for (const e of pending) {
      p++;
      try {
        await ctx.prisma.outboxEvent.update({
          where: { id: e.id },
          data: { status: "processing", attempts: { increment: 1 } }
        });
        ctx.logger.info(`Published: ${e.eventType}`);
        await ctx.prisma.outboxEvent.update({
          where: { id: e.id },
          data: { status: "published", processedAt: new Date() }
        });
        ok++;
      } catch (err) {
        fail++;
        const a = e.attempts + 1;
        if (a >= e.maxAttempts)
          await ctx.prisma.outboxEvent.update({
            where: { id: e.id },
            data: { status: "failed", lastError: (err as Error).message }
          });
        else
          await ctx.prisma.outboxEvent.update({
            where: { id: e.id },
            data: {
              status: "pending",
              availableAt: new Date(Date.now() + Math.pow(2, a) * 1000),
              lastError: (err as Error).message
            }
          });
      }
    }
    return {
      success: true,
      itemsProcessed: p,
      itemsSucceeded: ok,
      itemsFailed: fail,
      durationMs: Date.now() - s
    };
  }
};

export const InventoryReservationCleanupJob: Job = {
  name: "inventory-reservation-cleanup",
  schedule: "*/30 * * * *",
  async execute(ctx): Promise<JobResult> {
    const s = Date.now();
    const r = await ctx.prisma.inventoryReservation.updateMany({
      where: { status: "active", expiresAt: { lt: new Date() } },
      data: { status: "expired", expiredAt: new Date() }
    });
    return {
      success: true,
      itemsProcessed: r.count,
      itemsSucceeded: r.count,
      itemsFailed: 0,
      durationMs: Date.now() - s
    };
  }
};

let _registry: JobRegistry | null = null;
export function getJobRegistry(): JobRegistry {
  if (!_registry) {
    _registry = new JobRegistry();
    _registry.register(OutboxDispatcherJob);
    _registry.register(InventoryReservationCleanupJob);
  }
  return _registry;
}
