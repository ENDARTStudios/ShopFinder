/**
 * @workspace/infrastructure/connectors/digikey/pagination
 *
 * DigiKey V4 pagination — offset based. A API não ecoa o offset na resposta;
 * o total vem de ProductsCount e a página em Products[]. O cursor (Offset)
 * é injetado no BODY do KeywordRequest pelo connector (não em query param).
 */
import type {
  PaginationStrategy,
  DiscoveryRequest,
  HttpRequest,
  HttpResponse
} from "../core/types";

export class DigiKeyOffsetPagination implements PaginationStrategy<string> {
  readonly name = "digikey-offset";

  first(_request: DiscoveryRequest): string {
    return "0";
  }

  next(response: HttpResponse, cursor: string): string | null {
    try {
      const json = JSON.parse(response.body);
      const totalCount = Number(json?.ProductsCount ?? 0);
      const count = (json?.Products as unknown[] | undefined)?.length ?? 0;
      const currentOffset = Number(cursor);
      const nextOffset = currentOffset + count;
      if (nextOffset >= totalCount) return null;
      return String(nextOffset);
    } catch {
      return null;
    }
  }

  apply(request: HttpRequest, _cursor: string): HttpRequest {
    // Offset já é injetado no body pelo buildRequest (KeywordRequest.Offset).
    return request;
  }
}
