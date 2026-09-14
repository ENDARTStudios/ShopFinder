/**
 * @workspace/infrastructure/queues/bullmq
 *
 * BullMQ + Redis async processing layer for the discovery pipeline.
 *
 * The domain stays unchanged. BullMQ is pure infrastructure:
 *   - DiscoveryDispatcher: enqueues jobs into BullMQ Queue (Redis)
 *   - DiscoveryWorkerProcess: dequeues and executes via domain Worker
 *   - BullMQMetricsAdapter: converts BullMQ events → StageMetrics
 *   - RetryPolicy: BullMQ native retry (no domain duplication)
 *
 * Flow:
 *   Planner → Orchestrator → DiscoveryJob[] → dispatcher.dispatch()
 *   → BullMQ Queue → Redis → Worker Process → Worker.execute()
 *   → RawStoreCoordinator → ack
 */

export * from "./types";
export * from "./queue-factory";
export * from "./discovery-dispatcher";
export * from "./discovery-worker-process";
export * from "./retry-policy";
export * from "./events";
