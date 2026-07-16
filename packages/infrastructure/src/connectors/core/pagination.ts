/**
 * @workspace/infrastructure/connectors/core/pagination
 *
 * PaginationStrategy implementations.
 * Each marketplace paginates differently — swap without changing the connector.
 *
 * Common patterns:
 *   - CursorPagination: next cursor in response body (AliExpress, Amazon)
 *   - OffsetPagination: offset + limit in query params (WooCommerce)
 *   - PagePagination: page number in query params (Shopify, Mercado Livre)
 *   - LinkPagination: next URL in Link header (REST APIs)
 */
import type { PaginationStrategy, DiscoveryRequest, HttpRequest, HttpResponse } from "./types";

// ── CursorPagination ───────────────────────────────────────

/**
 * Cursor-based pagination — the cursor is a string token returned by the API.
 * Used by AliExpress (page_no), Amazon (NextToken), etc.
 */
export class CursorPagination implements PaginationStrategy<string> {
  readonly name = "cursor";
  private readonly cursorParam: string;
  private readonly nextCursorPath: string;

  constructor(cursorParam: string = "page_token", nextCursorPath: string = "next_page_token") {
    this.cursorParam = cursorParam;
    this.nextCursorPath = nextCursorPath;
  }

  first(_request: DiscoveryRequest): string {
    return "1"; // Start at page 1
  }

  next(response: HttpResponse, _cursor: string): string | null {
    try {
      const json = JSON.parse(response.body);
      const nextCursor = this.extractPath(json, this.nextCursorPath);
      if (nextCursor && nextCursor !== "0" && nextCursor !== "") {
        return String(nextCursor);
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
        [this.cursorParam]: cursor
      }
    };
  }

  private extractPath(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }
    return current;
  }
}

// ── OffsetPagination ───────────────────────────────────────

/**
 * Offset-based pagination — offset + limit in query params.
 * Used by WooCommerce, many REST APIs.
 */
export class OffsetPagination implements PaginationStrategy<{ offset: number; limit: number }> {
  readonly name = "offset";

  first(request: DiscoveryRequest): { offset: number; limit: number } {
    return { offset: 0, limit: request.limit };
  }

  next(response: HttpResponse, cursor: { offset: number; limit: number }): { offset: number; limit: number } | null {
    try {
      const json = JSON.parse(response.body);
      const items = Array.isArray(json) ? json : (json.items ?? json.data ?? []);
      if (items.length < cursor.limit) return null;
      return { offset: cursor.offset + cursor.limit, limit: cursor.limit };
    } catch {
      return null;
    }
  }

  apply(request: HttpRequest, cursor: { offset: number; limit: number }): HttpRequest {
    return {
      ...request,
      query: {
        ...request.query,
        offset: String(cursor.offset),
        limit: String(cursor.limit)
      }
    };
  }
}

// ── PagePagination ─────────────────────────────────────────

/**
 * Page-number pagination — page + per_page in query params.
 * Used by Shopify, Mercado Livre.
 */
export class PagePagination implements PaginationStrategy<{ page: number; perPage: number }> {
  readonly name = "page";

  first(request: DiscoveryRequest): { page: number; perPage: number } {
    return { page: 1, perPage: request.limit };
  }

  next(response: HttpResponse, cursor: { page: number; perPage: number }): { page: number; perPage: number } | null {
    try {
      const json = JSON.parse(response.body);
      const items = Array.isArray(json) ? json : (json.results ?? json.data ?? []);
      if (items.length < cursor.perPage) return null;
      return { page: cursor.page + 1, perPage: cursor.perPage };
    } catch {
      return null;
    }
  }

  apply(request: HttpRequest, cursor: { page: number; perPage: number }): HttpRequest {
    return {
      ...request,
      query: {
        ...request.query,
        page: String(cursor.page),
        per_page: String(cursor.perPage)
      }
    };
  }
}

// ── Factories ──────────────────────────────────────────────

export function createCursorPagination(cursorParam?: string, nextCursorPath?: string): CursorPagination {
  return new CursorPagination(cursorParam, nextCursorPath);
}

export function createOffsetPagination(): OffsetPagination {
  return new OffsetPagination();
}

export function createPagePagination(): PagePagination {
  return new PagePagination();
}
