/**
 * @workspace/domain/discovery/orchestrator
 *
 * Barrel exports for the Discovery Orchestrator module (A2.2).
 *
 * Layout:
 *   types.ts              — Plan lifecycle, ExecutionKey, ExecutionContext, results
 *   interfaces.ts         — 6 contracts (Validator, JobFactory, Reservation,
 *                            Registry, EventPublisher, MetricsCollector)
 *   events.ts             — 5 event types + factories
 *   metrics.ts            — In-memory MetricsCollector + NoopEventPublisher
 *   validator.ts          — DefaultPlanValidator
 *   job-factory.ts        — DefaultJobFactory (deterministic)
 *   reservation.ts        — In-memory BudgetReservationService
 *   execution-registry.ts — In-memory ExecutionRegistry
 *   orchestrator.ts       — DiscoveryOrchestrator (coordinator)
 *   orchestrator.test.ts  — Test suite
 */

// Types
export * from "./types";

// Interfaces
export * from "./interfaces";

// Events
export * from "./events";

// Implementations
export * from "./metrics";
export * from "./validator";
export * from "./job-factory";
export * from "./reservation";
export * from "./execution-registry";
export * from "./orchestrator";
