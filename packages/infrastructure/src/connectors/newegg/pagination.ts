/**
 * @workspace/infrastructure/connectors/newegg/pagination
 *
 * Newegg API pagination — page number + total pages.
 */
import type { PaginationStrategy, DiscoveryRequest, HttpRequest, HttpResponse } from "../core/types";

export class NeweggPagePagination implements PaginationStrategy<string> {
  readonly name = "newegg-page";

  first(_request: DiscoveryRequest): string {
    return "1";
  }

  next(response: HttpResponse, cursor: string): string | null {
    try {
      const json = JSON.parse(response.body);
      const totalPages = Number(json?.TotalPageCount ?? 1);
      const currentPage = Number(cursor);
      if (currentPage < totalPages) {
        return String(currentPage + 1);
      }
      return null;
    } catch {
      return null;
    }
  }

  apply(request: HttpRequest, cursor: string): HttpRequest {
    return {
      ...request,
      query: {
        ...request.query,
        pageNumber: cursor,
      },
    };
  }
}
