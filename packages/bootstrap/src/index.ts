/**
 * @workspace/bootstrap — Composition Root
 */
import { prisma } from "@workspace/database";
import { PrismaUnitOfWork, PrismaRepositoryFactory } from "@workspace/database";
import { CommandBus, QueryBus } from "@workspace/application";
import { getEventBus, type DomainEventBus } from "@workspace/domain/shared";
import { getProviderRegistry, type ProviderCapabilityRegistry } from "@workspace/providers";
import { getJobRegistry, type JobRegistry } from "@workspace/jobs";
import {
  getConsumerRegistry,
  registerAllConsumers,
  type ConsumerRegistry
} from "@workspace/events";
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
  readonly isInitialized: boolean;
}

let _container: Container | null = null;

export function createContainer(): Container {
  if (_container) return _container;
  const factory = new PrismaRepositoryFactory(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma, factory);
  const commandBus = new CommandBus({
    transaction: async <T>(fn: (repos: unknown, tx: unknown) => Promise<T>): Promise<T> => {
      return unitOfWork.transaction(async (repos) => fn(repos, repos) as Promise<T>);
    }
  });
  const queryBus = new QueryBus();
  const eventBus = getEventBus();
  const consumerRegistry = getConsumerRegistry();
  registerAllConsumers(eventBus, consumerRegistry);
  const providerRegistry = getProviderRegistry();
  const jobRegistry = getJobRegistry();
  _container = {
    prisma,
    unitOfWork,
    commandBus,
    queryBus,
    eventBus,
    providerRegistry,
    jobRegistry,
    consumerRegistry,
    isInitialized: true
  };
  return _container;
}

export function getContainer(): Container {
  return _container ?? createContainer();
}
export function resetContainer(): void {
  _container = null;
}
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
