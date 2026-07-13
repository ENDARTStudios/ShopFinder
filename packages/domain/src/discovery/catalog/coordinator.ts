/**
 * @workspace/domain/discovery/catalog/coordinator
 *
 * CatalogCoordinator — materializes approved products into CatalogEntries
 * and publishes them to configured destinations.
 *
 * Flow per approved product:
 *   1. Materializer.materialize(product, evaluation, compliance) → CatalogEntry
 *   2. Repository.appendEntry(entry)
 *   3. Emit CatalogEntryCreated
 *   4. For each destination: Publisher.publish(entry) → CatalogPublication
 *   5. Emit CatalogPublished (consumed by A2.11 SearchIndexer)
 */
import type {
  CatalogCoordinatorInput,
  CatalogCoordinatorResult,
  CatalogEntry,
  CatalogPublication,
  CatalogMetrics,
  CatalogMaterializer,
  CatalogPublisher,
  CatalogRepository,
  PublicationDestination
} from "./types";
import {
  makeCatalogEntryCreatedEvent,
  makeCatalogPublishedEvent,
  makeCatalogPublicationFailedEvent,
  type CatalogEvent
} from "./events";

export interface CatalogEventPublisher {
  publish(events: ReadonlyArray<CatalogEvent>): Promise<void>;
}

export interface CatalogCoordinatorDeps {
  readonly repository: CatalogRepository;
  readonly materializer: CatalogMaterializer;
  readonly publishers: ReadonlyMap<PublicationDestination, CatalogPublisher>;
  readonly events?: CatalogEventPublisher;
}

export class CatalogCoordinator {
  constructor(private readonly deps: CatalogCoordinatorDeps) {}

  async process(input: CatalogCoordinatorInput): Promise<CatalogCoordinatorResult> {
    const start = Date.now();
    const versions = { materializerVersion: this.deps.materializer.version };

    const entries: CatalogEntry[] = [];
    const publications: CatalogPublication[] = [];
    let publicationsFailed = 0;

    for (const { product, evaluation, compliance } of input.approved) {
      // 1. Materialize
      const entry = this.deps.materializer.materialize(product, evaluation, compliance);

      // 2. Persist
      await this.deps.repository.appendEntry(entry);
      entries.push(entry);

      // 3. Emit EntryCreated
      if (this.deps.events) {
        await this.deps.events.publish([
          makeCatalogEntryCreatedEvent(versions, {
            catalogEntryId: entry.id,
            canonicalProductId: entry.canonicalProductId,
            sku: entry.sku,
            slug: entry.slug,
            title: entry.title,
            brand: entry.brand,
            variantCount: entry.variants.length,
            imageCount: entry.images.length
          })
        ]);
      }

      // 4. Publish to each destination
      for (const destination of input.destinations) {
        const publisher = this.deps.publishers.get(destination);
        if (!publisher) continue;

        try {
          const publication = await publisher.publish(entry);
          await this.deps.repository.appendPublication(publication);
          publications.push(publication);

          if (this.deps.events) {
            await this.deps.events.publish([
              makeCatalogPublishedEvent(versions, {
                catalogEntryId: entry.id,
                canonicalProductId: entry.canonicalProductId,
                sku: entry.sku,
                destination: publication.destination,
                externalId: publication.externalId ?? "",
                publishedAt: publication.publishedAt.toISOString()
              })
            ]);
          }
        } catch (e) {
          publicationsFailed++;
          if (this.deps.events) {
            await this.deps.events.publish([
              makeCatalogPublicationFailedEvent(versions, {
                catalogEntryId: entry.id,
                destination,
                error: e instanceof Error ? e.message : String(e)
              })
            ]);
          }
        }
      }
    }

    const metrics: CatalogMetrics = {
      productsMaterialized: input.approved.length,
      entriesCreated: entries.length,
      publicationsCreated: publications.length,
      publicationsFailed,
      durationMs: Date.now() - start
    };

    return {
      batchId: input.batchId,
      entries,
      publications,
      metrics,
      durationMs: Date.now() - start
    };
  }
}

export function createCatalogCoordinator(deps: CatalogCoordinatorDeps): CatalogCoordinator {
  return new CatalogCoordinator(deps);
}
