/**
 * @workspace/infrastructure
 *
 * Infrastructure implementations for ShopFinder.
 *
 * Currently implements:
 *   - PrismaRawProductRepository (RawProductRepository interface)
 *   - PrismaNormalizedProductRepository (NormalizedProductRepository interface)
 *   - DiscoveryUnitOfWork (transaction boundary for atomic persistence)
 *
 * Future:
 *   - ObjectStorage (S3/MinIO for raw payloads)
 *   - Real marketplace connectors (AliExpress, Amazon, etc.)
 *   - Real InferenceProvider (OpenAI, Ollama)
 */

// Re-export Prisma client for convenience
// Note: PrismaClient is exported as `any` type to avoid TypeScript stack
// overflow from the deeply recursive generated types. At runtime, the
// actual PrismaClient class is used.
export type PrismaClient = any;

// Unit of Work
export type { DiscoveryUnitOfWork } from "./repositories/discovery/discovery-unit-of-work.js";
export {
  PrismaDiscoveryUnitOfWork,
  createDiscoveryUnitOfWork
} from "./repositories/discovery/discovery-unit-of-work.js";

// Repositories
export {
  PrismaRawProductRepository,
  createPrismaRawProductRepository
} from "./repositories/discovery/prisma-raw-product.repository.js";

export {
  PrismaNormalizedProductRepository,
  createPrismaNormalizedProductRepository
} from "./repositories/discovery/prisma-normalized-product.repository.js";

// Connector SDK
export * from "./connectors/core/index.js";
export * from "./connectors/aliexpress/index.js";
export * from "./connectors/amazon/index.js";
export * from "./connectors/ebay/index.js";
export * from "./connectors/digikey/index.js";
export * from "./connectors/newegg/index.js";

// Object Storage
export * from "./storage/index.js";

// BullMQ Queues
export * from "./queues/bullmq/index.js";

// Observability (OpenTelemetry)
export * from "./observability/index.js";

// Benchmarks
export * from "./benchmarks/index.js";
