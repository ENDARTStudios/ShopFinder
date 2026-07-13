/**
 * @workspace/domain/discovery/raw-store
 *
 * Barrel exports for the Raw Product Store module (A2.4).
 *
 * Design principles:
 *   - Two entities: DiscoveryExecution (audit) + RawProductRecord (payload)
 *   - Two-level hash: payloadHash (exact JSON) + semanticHash (post-normalization)
 *   - Append-only: no UPDATE, no DELETE
 *   - Full versioning on every record (schema + provider + workflow + planner + connector)
 *   - Compressed payload (gzip in prod, noop in dev)
 *   - Partition key: provider|country|yyyy-mm-dd
 *   - Stream-based reads for downstream consumers
 *   - Idempotent appends
 *
 * Layout:
 *   types.ts         — DiscoveryExecution, RawProductRecord, RawProductRepository interface
 *   hashing.ts       — payloadHash (FNV-1a canonical JSON) + semanticHash stub
 *   compression.ts   — Compressor interface + NoopCompressor + GzipCompressor
 *   events.ts        — RawProductsPersisted + RawProductsReadyForNormalization
 *   repository.ts    — InMemoryRawProductRepository (append-only)
 *   coordinator.ts   — RawStoreCoordinator (WorkerResult → persist → events)
 *   coordinator.test.ts — 10 acceptance criteria tests
 */

export * from "./types";
export * from "./hashing";
export * from "./compression";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
