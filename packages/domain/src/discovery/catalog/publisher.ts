/**
 * @workspace/domain/discovery/catalog/publisher
 *
 * DefaultCatalogPublisher — persists CatalogEntry and publishes events.
 * Supports multiple destinations (internal, shopify, woocommerce, etc.)
 * without changing materialization.
 */
import type {
  CatalogPublisher,
  CatalogEntry,
  CatalogPublication,
  CatalogPublicationId,
  PublicationDestination
} from "./types";

export class DefaultCatalogPublisher implements CatalogPublisher {
  readonly name = "default-catalog-publisher";

  constructor(private readonly destination: PublicationDestination = "internal") {}

  async publish(entry: CatalogEntry): Promise<CatalogPublication> {
    // In production, this would:
    // - internal: persist to PostgreSQL via repository
    // - shopify: call Shopify Admin API
    // - woocommerce: call WooCommerce REST API
    // - mercadolivre: call ML API
    // - amazon: call Amazon SP-API
    //
    // For now, simulate a successful publication.
    return {
      id: `pub_${entry.id}_${this.destination}` as unknown as CatalogPublicationId,
      catalogEntryId: entry.id,
      destination: this.destination,
      status: "published",
      publishedAt: new Date(),
      externalId: `${this.destination}-${entry.sku}`
    };
  }
}

export function createCatalogPublisher(
  destination: PublicationDestination = "internal"
): CatalogPublisher {
  return new DefaultCatalogPublisher(destination);
}
