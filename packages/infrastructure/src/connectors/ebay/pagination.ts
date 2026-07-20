/**
 * @workspace/infrastructure/connectors/ebay/pagination
 *
 * eBay Browse API pagination — offset-based, using string cursor.
 * The cursor is the offset as a string (e.g. "0", "2", "4").
 */
import type { PaginationStrategy, DiscoveryRequest, HttpRequest, HttpResponse } from "../core/types";

export class EbayOffsetPagination implements PaginationStrategy<string> {
  readonly name = "ebay-offset";

  first(_request: DiscoveryRequest): string {
    return "0";
  }

  next(response: HttpResponse, cursor: string): string | null {
    try {
      const json = JSON.parse(response.body);
      const total = Number(json?.total ?? 0);
      const limit = Number(json?.limit ?? 0);
      const currentOffset = Number(cursor);
      const nextOffset = currentOffset + limit;
      if (nextOffset >= total) return null;
      return String(nextOffset);
    } catch {
      return null;
    }
  }

  apply(request: HttpRequest, cursor: string): HttpRequest {
    return {
      ...request,
      query: {
        ...request.query,
        offset: cursor,
      },
    };
  }
}
