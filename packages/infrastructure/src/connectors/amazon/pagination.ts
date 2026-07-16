/**
 * @workspace/infrastructure/connectors/amazon/pagination
 *
 * Amazon SP-API pagination — NextToken cursor.
 * The Catalog Items API returns a `pagination` object with `nextToken`.
 */
import type { PaginationStrategy, DiscoveryRequest, HttpRequest, HttpResponse } from "../core/types";

export class AmazonNextTokenPagination implements PaginationStrategy<string> {
  readonly name = "amazon-next-token";

  first(_request: DiscoveryRequest): string {
    return ""; // First page has no token
  }

  next(response: HttpResponse, _cursor: string): string | null {
    try {
      const json = JSON.parse(response.body);
      const nextToken = json?.pagination?.nextToken;
      if (nextToken && typeof nextToken === "string" && nextToken.length > 0) {
        return nextToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  apply(request: HttpRequest, cursor: string): HttpRequest {
    if (!cursor) return request;

    // Amazon uses pageSize + pageType + nextToken as query params
    return {
      ...request,
      query: {
        ...request.query,
        pageType: "NEXT_TOKEN",
        nextToken: cursor,
      },
    };
  }
}
