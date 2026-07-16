/**
 * @workspace/bootstrap/container — Composition Root
 *
 * Per ADR-0023: single point of initialization. No Route Handler or
 * Application Service does manual composition. Everything is wired here.
 *
 * The Container is a singleton that holds references to:
 *   - Prisma client
 *   - PrismaUnitOfWork + PrismaRepositoryFactory
 *   - CommandBus + QueryBus (with all handlers registered)
 *   - Event bus + consumers
 *   - Provider registry
 *   - Job registry
 *   - Query services
 *   - Cache instances
 *
 * Usage:
 *   import { getContainer } from "@workspace/bootstrap";
 *   const container = getContainer();
 *   const result = await container.commandBus.execute("catalog.product.create", payload, ctx);
 */

import { prisma } from "@workspace/database";
import {
  PrismaUnitOfWork,
  PrismaRepositoryFactory,
  PrismaProductQueryService,
  PrismaCartQueryService,
  getEntityCache,
  getQueryCache,
  type EntityCache,
  type QueryCache
} from "@workspace/database";
import { CommandBus, QueryBus } from "@workspace/application";
import { getEventBus, type DomainEventBus } from "@workspace/domain/shared";
import { getProviderRegistry, type ProviderCapabilityRegistry } from "@workspace/providers";
import { getJobRegistry, type JobRegistry } from "@workspace/jobs";
import {
  getConsumerRegistry,
  registerAllConsumers,
  type ConsumerRegistry
} from "@workspace/events";
import { registerHandlers } from "./buses";
import { registerConsumers } from "./events";
import { registerJobs } from "./jobs";
import { registerProviders } from "./providers";
import type { PrismaClient } from "@prisma/client";

export interface Container {
  readonly prisma: PrismaClient;
  readonly unitOfWork: PrismaUnitOfWork;
  readonly commandBus: CommandBus;
  readonly queryBus: QueryBus;
  readonly eventBus: DomainEventBus;
  readonly providerRegistry: ProviderCapabilityRegistry;
  readonly jobRegistry: JobRegistry;
  readonly consumerRegistry: ConsumerRegistry;
  readonly entityCache: EntityCache;
  readonly queryCache: QueryCache;
  readonly isInitialized: boolean;
}

let _container: Container | null = null;

export function createContainer(): Container {
  if (_container) return _container;

  // ── Database ──────────────────────────────────────────────
  const factory = new PrismaRepositoryFactory(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma, factory);
  const entityCache = getEntityCache();
  const queryCache = getQueryCache();

  // ── Buses ─────────────────────────────────────────────────
  const commandBus = new CommandBus(unitOfWork);
  const queryBus = new QueryBus();

  // ── Create Query Services (from @workspace/database) ──────
  const productQueryService = new PrismaProductQueryService(prisma, queryCache, entityCache);
  const cartQueryService = new PrismaCartQueryService(prisma);

  // ── Register handlers (pass query services, NOT PrismaClient) ──
  registerHandlers(commandBus, queryBus, productQueryService, cartQueryService);

  // ── Event Bus + Consumers ─────────────────────────────────
  const eventBus = getEventBus();
  const consumerRegistry = getConsumerRegistry();
  registerAllConsumers(eventBus, consumerRegistry);

  // ── Providers ─────────────────────────────────────────────
  const providerRegistry = getProviderRegistry();
  registerProviders(providerRegistry);

  // ── Jobs ──────────────────────────────────────────────────
  const jobRegistry = getJobRegistry();
  registerJobs(jobRegistry);

  _container = {
    prisma,
    unitOfWork,
    commandBus,
    queryBus,
    eventBus,
    providerRegistry,
    jobRegistry,
    consumerRegistry,
    entityCache,
    queryCache,
    isInitialized: true
  };

  return _container;
}

export function getContainer(): Container {
  if (!_container) return createContainer();
  return _container;
}

export function resetContainer(): void {
  _container = null;
}

// ── Typed accessors (convenience) ───────────────────────────

export function getCommandBus(): CommandBus {
  return getContainer().commandBus;
}

export function getQueryBus(): QueryBus {
  return getContainer().queryBus;
}

export function getUnitOfWork(): PrismaUnitOfWork {
  return getContainer().unitOfWork;
}

export function getPrisma(): PrismaClient {
  return getContainer().prisma;
}
