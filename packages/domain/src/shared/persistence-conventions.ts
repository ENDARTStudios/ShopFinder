/**
 * @workspace/domain/shared/persistence-conventions
 *
 * Persistence conventions applied to ALL persistent aggregates.
 * These are documented in ADR-0009 and enforced by the Prisma schema (04B).
 *
 * Reading this file tells you the shape of every table in the database.
 */

// ── Audit Fields ────────────────────────────────────────────
//
// Every persistent table has:
//   createdAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
//   updatedAt   TIMESTAMPTZ NOT NULL DEFAULT NOW()
//   deletedAt   TIMESTAMPTZ NULL                    -- soft delete
//   createdBy   VARCHAR(30) NULL                    -- actor who created (user id, "system", "seed")
//   updatedBy   VARCHAR(30) NULL                    -- actor who last updated
//
// Soft delete: queries default to `WHERE deletedAt IS NULL`.
// Hard delete is forbidden in application code; only via admin script.

export interface AuditFields {
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date | null;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
}

// ── Optimistic Lock ─────────────────────────────────────────
//
// Aggregates that can have concurrent writes carry a `version` column:
//   version INTEGER NOT NULL DEFAULT 1
//
// On every update, the repository does:
//   UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?
// If 0 rows affected → OptimisticLockError → retry or abort.
//
// Applied to: Product, Category, Customer, Cart, CheckoutSession, Order,
// Payment, Supplier, SupplierOrder, ProductOffer, Inventory.

export interface Versioned {
  readonly version: number;
}

// ── Money Persistence ───────────────────────────────────────
//
// Money is NEVER stored as DECIMAL. It is always:
//   amount_in_minor_units BIGINT NOT NULL   -- cents (e.g. 1999 = $19.99)
//   currency              CHAR(3) NOT NULL  -- ISO 4217 (e.g. "USD")
//
// BIGINT is used (not INTEGER) because some currencies have 0 decimal
// places (JPY) and large amounts can overflow INT. BIGINT gives headroom.
//
// The domain Money type (amount: number, currency: string) maps directly:
//   domain.money(amount, currency)  ↔  { amount_in_minor_units, currency }
//
// See ADR-0009 § Money for rationale.

export interface MoneyColumns {
  amount_in_minor_units: bigint; // maps to domain Money.amount (number)
  currency: string; // maps to domain Money.currency (3-char ISO)
}

// ── Soft Delete Helper ──────────────────────────────────────
//
// Repository methods that find aggregates have two variants:
//   findById(id)         → finds active (non-deleted) only
//   findByIdIncludingDeleted(id) → finds any (for admin restore)
//
// The `findActive*` naming is used in list queries.

export interface SoftDeletable {
  deletedAt?: Date | null;
}

// ── Persistence Error ───────────────────────────────────────

export interface PersistenceError {
  readonly code:
    | "OPTIMISTIC_LOCK_FAILED"
    | "NOT_FOUND"
    | "ALREADY_DELETED"
    | "UNIQUE_CONSTRAINT"
    | "FOREIGN_KEY_CONSTRAINT"
    | "TRANSACTION_FAILED";
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

// ── Idempotency Key (per Ajuste 6) ──────────────────────────
//
// Protects against duplicate processing of webhooks, retries, and
// double-submits. The client sends an Idempotency-Key header; the server
// stores the key + a hash of the response. On retry, the stored response
// is returned without re-executing the operation.
//
// Table: idempotency_keys
//   key             VARCHAR(200) PK   — the idempotency key (client-provided)
//   scope           VARCHAR(50)       — "payment", "webhook", "order", ...
//   request_hash    CHAR(64)          — SHA-256 of the request body (for conflict detection)
//   response_hash   CHAR(64) NULL     — SHA-256 of the response (NULL until first execution)
//   response_body   JSONB NULL        — cached response body
//   status_code     INTEGER NULL      — cached HTTP status
//   expires_at      TIMESTAMPTZ       — TTL (e.g. 24h)
//   created_at      TIMESTAMPTZ
//   + audit fields
//
// Usage:
//   POST /api/payments/intent  with header: Idempotency-Key: abc-123
//   → first call: execute, store response, return 200
//   → retry with same key + same request hash: return cached 200
//   → retry with same key + DIFFERENT request hash: return 409 Conflict

export interface IdempotencyKey {
  readonly key: string; // client-provided idempotency key
  readonly scope: string; // "payment" | "webhook" | "order" | ...
  readonly requestHash: string; // SHA-256 of request body (conflict detection)
  readonly responseHash?: string; // SHA-256 of response (NULL until executed)
  readonly responseBody?: unknown; // cached response (JSONB)
  readonly statusCode?: number; // cached HTTP status
  readonly expiresAt: Date; // TTL
  readonly createdAt: Date;
}

// ── Outbox Pattern (per Ajuste 1 of 04B.1 feedback) ─────────
//
// Critical domain events (OrderPlaced, PaymentCaptured, SupplierOrderPlaced)
// are written to the outbox table IN THE SAME TRANSACTION as the aggregate
// change. A background worker polls the outbox, publishes to the event bus,
// and marks rows as processed.
//
// Guarantees: event never lost (persisted before publish), retry-safe
// (attempts + availableAt for exponential backoff), ordered within aggregate.

export type OutboxStatus = "pending" | "processing" | "published" | "failed";

export interface OutboxEvent {
  readonly id: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown; // JSON-serializable event data
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly availableAt: Date; // next retry time (for backoff)
  readonly processedAt?: Date;
  readonly lastError?: string;
  readonly createdAt: Date;
}

// ── Webhook Inbox Pattern (per Ajuste 2 of 04B.1 feedback) ──
//
// Incoming webhooks are stored in an inbox table BEFORE processing. Protects
// against: duplicate webhooks (idempotency via provider + externalId),
// out-of-order delivery (process by receivedAt), infinite retries.
//
// UNIQUE (provider, external_id)

export type WebhookStatus = "received" | "processing" | "processed" | "failed";

export interface WebhookEvent {
  readonly id: string;
  readonly provider: string;
  readonly externalId: string; // provider's event ID
  readonly eventType: string;
  readonly payload: unknown; // raw webhook body (JSON)
  readonly headers?: Record<string, string>;
  readonly status: WebhookStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly receivedAt: Date;
  readonly processedAt?: Date;
  readonly lastError?: string;
}

// ── External Identity (per Ajuste 3 of 04B.1 feedback) ──────
//
// Entities synced from external systems carry (externalProvider, externalId)
// for idempotent upserts. @@unique([externalProvider, externalId]).
// Applied to: ProductOffer (supplierSku as externalId), SupplierProduct,
// SyncExecutionLog (providerExecutionId).

export interface ExternalIdentity {
  readonly externalProvider?: string;
  readonly externalId?: string;
}

// ── Re-export ───────────────────────────────────────────────
export type { Result, DomainError } from "./types";
