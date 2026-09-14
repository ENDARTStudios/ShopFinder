/**
 * @workspace/domain/integration
 *
 * Bounded Context: Integration (external API orchestration)
 *
 * Per Ajuste 5: model the integration layer explicitly. This context manages:
 *   - Integration: config for an external system (supplier API, payment provider, etc.)
 *   - SupplierCredential: secret reference (never the secret itself — points to env/secret manager)
 *   - SyncJob: scheduled or triggered sync definition (e.g. "sync AliExpress catalog every 1h")
 *   - SyncExecutionLog: per-run log (started, finished, status, items processed, errors)
 *
 * Secrets are NEVER stored in the database. Only a `secretReference` string
 * (e.g. "ALIEXPRESS_API_KEY" env var name, or "vault:suppliers/aliexpress/key")
 * is persisted. The runtime resolves the reference to the actual secret.
 *
 * Aggregate roots: Integration, SyncJob
 * Entities: SupplierCredential, SyncExecutionLog
 */

import {
  type IntegrationId,
  type SyncJobId,
  type SyncExecutionId,
  type SupplierId,
  type EntityId,
  type AggregateRoot,
  type DomainEvent,
  type Result,
  type DomainError,
  asIntegrationId,
  ok,
  err,
  DomainEventBase
} from "../shared";

// ── Value objects ───────────────────────────────────────────

export type IntegrationType =
  | "supplier_catalog_sync"
  | "supplier_order_fulfillment"
  | "supplier_webhook"
  | "payment_provider"
  | "shipping_provider"
  | "tax_provider"
  | "email_provider"
  | "analytics";

export type SyncStatus = "pending" | "running" | "succeeded" | "failed" | "timeout" | "cancelled";

export type SyncTrigger = "scheduled" | "manual" | "webhook" | "event";

export interface SyncSchedule {
  readonly cron: string; // cron expression (e.g. "0 */1 * * *")
  readonly timezone: string; // IANA
  readonly enabled: boolean;
}

// ── Entity: SupplierCredential (secret reference only) ──────

export interface SupplierCredential {
  readonly id: string;
  readonly integrationId: IntegrationId;
  readonly supplierId?: SupplierId;
  readonly keyName: string; // logical name (e.g. "apiKey", "apiSecret", "webhookSecret")
  readonly secretReference: string; // env var name or vault path — NEVER the secret value
  readonly lastRotatedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ── Entity: SyncExecutionLog ────────────────────────────────

export interface SyncExecutionLog {
  readonly id: SyncExecutionId;
  readonly syncJobId: SyncJobId;
  readonly trigger: SyncTrigger;
  readonly status: SyncStatus;
  readonly startedAt: Date;
  readonly finishedAt?: Date;
  readonly durationMs?: number;
  readonly itemsProcessed: number;
  readonly itemsSucceeded: number;
  readonly itemsFailed: number;
  readonly errorMessage?: string;
  readonly errorDetails?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

// ── Aggregate root: Integration ─────────────────────────────

export interface Integration extends AggregateRoot<"IntegrationId"> {
  readonly type: IntegrationType;
  readonly name: string;
  readonly supplierId?: SupplierId; // if supplier-scoped
  readonly providerCode: string; // e.g. "aliexpress", "stripe", "sendgrid"
  readonly status: "active" | "inactive" | "error";
  readonly credentials: ReadonlyArray<SupplierCredential>;
  readonly config: Record<string, unknown>; // non-secret config (endpoints, timeouts)
  readonly lastSyncAt?: Date;
  readonly lastError?: string;
}

// ── Aggregate root: SyncJob ─────────────────────────────────

export interface SyncJob extends AggregateRoot<"SyncJobId"> {
  readonly integrationId: IntegrationId;
  readonly name: string;
  readonly description?: string;
  readonly schedule: SyncSchedule;
  readonly trigger: SyncTrigger;
  readonly enabled: boolean;
  readonly lastExecutionId?: SyncExecutionId;
  readonly lastRunAt?: Date;
  readonly nextRunAt?: Date;
}

// ── Domain events ───────────────────────────────────────────

export class IntegrationConnected extends DomainEventBase {
  constructor(params: { aggregateId: IntegrationId; type: IntegrationType; providerCode: string }) {
    super({ ...params, aggregateType: "Integration", eventType: "integration.connected" });
  }
}

export class IntegrationDisconnected extends DomainEventBase {
  constructor(params: { aggregateId: IntegrationId }) {
    super({ ...params, aggregateType: "Integration", eventType: "integration.disconnected" });
  }
}

export class SyncJobStarted extends DomainEventBase {
  constructor(params: { aggregateId: SyncJobId; executionId: SyncExecutionId }) {
    super({ ...params, aggregateType: "SyncJob", eventType: "sync.started" });
  }
}

export class SyncJobSucceeded extends DomainEventBase {
  constructor(params: {
    aggregateId: SyncJobId;
    executionId: SyncExecutionId;
    itemsProcessed: number;
  }) {
    super({ ...params, aggregateType: "SyncJob", eventType: "sync.succeeded" });
  }
}

export class SyncJobFailed extends DomainEventBase {
  constructor(params: {
    aggregateId: SyncJobId;
    executionId: SyncExecutionId;
    errorMessage: string;
  }) {
    super({ ...params, aggregateType: "SyncJob", eventType: "sync.failed" });
  }
}

// ── Factory ─────────────────────────────────────────────────

export function connectIntegration(params: {
  id?: IntegrationId;
  type: IntegrationType;
  name: string;
  providerCode: string;
  supplierId?: SupplierId;
  config?: Record<string, unknown>;
}): Result<Integration, DomainError> {
  try {
    const id = params.id ?? asIntegrationId(`int_${params.providerCode}_${Date.now()}`);
    const now = new Date();
    const integration: Integration = {
      id,
      type: params.type,
      name: params.name,
      supplierId: params.supplierId,
      providerCode: params.providerCode,
      status: "active",
      credentials: [],
      config: params.config ?? {},
      createdAt: now,
      updatedAt: now,
      domainEvents: [
        new IntegrationConnected({
          aggregateId: id,
          type: params.type,
          providerCode: params.providerCode
        })
      ],
      markEventsAsCommitted() {}
    };
    return ok(integration);
  } catch (e) {
    return err({ code: "INTEGRATION.INVALID", message: (e as Error).message });
  }
}

export type { EntityId, DomainEvent, Result, DomainError, SupplierId };
