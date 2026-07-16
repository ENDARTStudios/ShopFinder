/**
 * @workspace/infrastructure/connectors/digikey/pagination
 *
 * DigiKey API pagination — offset + count based.
 * DigiKey returns { totalCount, count, offset } in the response.
 */
import type { PaginationStrategy, DiscoveryRequest, HttpRequest, HttpResponse } from "../core/types";

export class DigiKeyOffsetPagination implements PaginationStrategy<string> {
  readonly name = "digikey-offset";

  first(request: DiscoveryRequest): string {
    return "0";
  }

  next(response: HttpResponse, cursor: string): string | null {
    try {
      const json = JSON.parse(response.body);
      const totalCount = Number(json?.Products?.TotalCount ?? 0);
      const count = Number(json?.Products?.Count ?? 0);
      const currentOffset = Number(cursor);
      const nextOffset = currentOffset + count;
      if (nextOffset >= totalCount) return null;
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
