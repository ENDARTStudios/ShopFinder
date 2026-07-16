/**
 * @workspace/infrastructure/connectors/core/connector-sdk.test
 *
 * Tests for the Connector SDK core contracts + ReplayTransport.
 */
/// <reference types="bun-types" />
import { describe, it, expect } from "bun:test";
import {
  ReplayTransport,
  RecordingTransport,
  FetchTransport,
  createFetchTransport,
  createReplayTransport,
  createRecordingTransport,
  type RecordedInteraction
} from "./transport";
import {
  NoopAuthProvider,
  BearerAuthProvider,
  ApiKeyAuthProvider,
  createNoopAuthProvider,
  createBearerAuthProvider
} from "./auth";
import {
  CursorPagination,
  OffsetPagination,
  PagePagination,
  createCursorPagination,
  createOffsetPagination,
  createPagePagination
} from "./pagination";
import {
  HttpRetryPolicy,
  NoRetryPolicy,
  createHttpRetryPolicy,
  createNoRetryPolicy,
  toConnectorError
} from "./retry";
import {
  StringCheckpointSerializer,
  JsonCheckpointSerializer,
  createStringCheckpointSerializer,
  createJsonCheckpointSerializer
} from "./checkpoint";
import {
  TokenBucketConnectorRateLimiter,
  NoopRateLimiter,
  createTokenBucketRateLimiter,
  createNoopRateLimiter
} from "./rate-limiter";
import { ConnectorErrors, fromHttpStatus } from "./errors";
import { createConnectorMetricsCollector } from "./metrics";
import type { HttpRequest, HttpResponse, DiscoveryRequest } from "./types";

// ── Helpers ────────────────────────────────────────────────

function makeResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    durationMs: 10
  };
}

function makeRequest(url: string = "https://api.example.com/products"): HttpRequest {
  return {
    method: "GET",
    url,
    headers: {},
    timeoutMs: 5000
  };
}

// ── Tests ──────────────────────────────────────────────────

describe("Connector SDK", () => {

  // ── ReplayTransport ─────────────────────────────────────
  describe("ReplayTransport", () => {
    it("should replay recorded responses by URL match", async () => {
      const recordings: RecordedInteraction[] = [
        {
          request: { method: "GET", url: "https://api.example.com/products" },
          response: makeResponse(200, { products: [{ id: 1 }] })
        }
      ];
      const transport = createReplayTransport(recordings);
      const response = await transport.execute(makeRequest());

      expect(response.status).toBe(200);
      expect(JSON.parse(response.body).products[0].id).toBe(1);
    });

    it("should replay sequentially for paginated requests", async () => {
      const recordings: RecordedInteraction[] = [
        {
          request: { method: "GET", url: "https://api.example.com/products?page=1" },
          response: makeResponse(200, { products: [{ id: 1 }], next: "page2" })
        },
        {
          request: { method: "GET", url: "https://api.example.com/products?page=2" },
          response: makeResponse(200, { products: [{ id: 2 }], next: null })
        }
      ];
      const transport = createReplayTransport(recordings);

      const r1 = await transport.execute(makeRequest("https://api.example.com/products?page=1"));
      const r2 = await transport.execute(makeRequest("https://api.example.com/products?page=2"));

      expect(JSON.parse(r1.body).products[0].id).toBe(1);
      expect(JSON.parse(r2.body).products[0].id).toBe(2);
    });

    it("should throw when no recording matches", async () => {
      const transport = createReplayTransport([]);
      expect(transport.execute(makeRequest())).rejects.toThrow("no recorded response");
    });

    it("should load from JSON", async () => {
      const json = JSON.stringify([
        {
          request: { method: "GET", url: "https://api.example.com/test" },
          response: makeResponse(200, { ok: true })
        }
      ]);
      const transport = ReplayTransport.fromJson(json);
      const response = await transport.execute(makeRequest("https://api.example.com/test"));
      expect(response.status).toBe(200);
    });
  });

  // ── RecordingTransport ──────────────────────────────────
  describe("RecordingTransport", () => {
    it("should record interactions from inner transport", async () => {
      const inner = createReplayTransport([
        {
          request: { method: "GET", url: "https://api.example.com/test" },
          response: makeResponse(200, { ok: true })
        }
      ]);
      const recording = createRecordingTransport(inner);

      await recording.execute(makeRequest("https://api.example.com/test"));

      const recordings = recording.getRecordings();
      expect(recordings.length).toBe(1);
      expect(recordings[0]!.response.status).toBe(200);
    });

    it("should serialize to JSON", async () => {
      const inner = createReplayTransport([
        {
          request: { method: "GET", url: "https://api.example.com/test" },
          response: makeResponse(200, { ok: true })
        }
      ]);
      const recording = createRecordingTransport(inner);
      await recording.execute(makeRequest("https://api.example.com/test"));

      const json = recording.toJson();
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(1);
    });
  });

  // ── Auth ────────────────────────────────────────────────
  describe("AuthProvider", () => {
    it("NoopAuthProvider should pass through", async () => {
      const auth = createNoopAuthProvider();
      const request = makeRequest();
      const authenticated = await auth.authenticate(request);
      expect(authenticated).toEqual(request);
    });

    it("BearerAuthProvider should add Authorization header", async () => {
      const auth = createBearerAuthProvider("my-token");
      const authenticated = await auth.authenticate(makeRequest());
      expect(authenticated.headers.Authorization).toBe("Bearer my-token");
    });

    it("ApiKeyAuthProvider should add query param", async () => {
      const auth = new ApiKeyAuthProvider("api_key", "secret123");
      const authenticated = await auth.authenticate(makeRequest());
      expect(authenticated.query?.api_key).toBe("secret123");
    });
  });

  // ── Pagination ──────────────────────────────────────────
  describe("PaginationStrategy", () => {
    const request: DiscoveryRequest = {
      region: "US",
      language: "en",
      limit: 20
    };

    it("CursorPagination should extract next cursor", () => {
      const pagination = createCursorPagination("page_token", "next_page_token");
      const cursor = pagination.first(request);
      expect(cursor).toBe("1");

      const response = makeResponse(200, { next_page_token: "abc123" });
      const next = pagination.next(response, cursor);
      expect(next).toBe("abc123");
    });

    it("CursorPagination should return null when no more pages", () => {
      const pagination = createCursorPagination();
      const response = makeResponse(200, { next_page_token: "" });
      const next = pagination.next(response, "1");
      expect(next).toBeNull();
    });

    it("OffsetPagination should increment offset", () => {
      const pagination = createOffsetPagination();
      const cursor = pagination.first(request);
      expect(cursor.offset).toBe(0);

      const response = makeResponse(200, { items: new Array(20) });
      const next = pagination.next(response, cursor);
      expect(next?.offset).toBe(20);
    });

    it("PagePagination should increment page", () => {
      const pagination = createPagePagination();
      const cursor = pagination.first(request);
      expect(cursor.page).toBe(1);

      const response = makeResponse(200, { results: new Array(20) });
      const next = pagination.next(response, cursor);
      expect(next?.page).toBe(2);
    });
  });

  // ── Retry ───────────────────────────────────────────────
  describe("RetryPolicy", () => {
    it("HttpRetryPolicy should retry 429 and 5xx", () => {
      const policy = createHttpRetryPolicy(3);
      expect(policy.shouldRetry(1, { code: "RATE_LIMIT", message: "x", retriable: true, statusCode: 429 })).toBe(true);
      expect(policy.shouldRetry(1, { code: "NETWORK", message: "x", retriable: true, statusCode: 500 })).toBe(true);
    });

    it("HttpRetryPolicy should NOT retry 401", () => {
      const policy = createHttpRetryPolicy(3);
      expect(policy.shouldRetry(1, { code: "AUTH", message: "x", retriable: false, statusCode: 401 })).toBe(false);
    });

    it("HttpRetryPolicy should respect maxAttempts", () => {
      const policy = createHttpRetryPolicy(2);
      expect(policy.shouldRetry(2, { code: "TIMEOUT", message: "x", retriable: true })).toBe(false);
    });

    it("NoRetryPolicy should never retry", () => {
      const policy = createNoRetryPolicy();
      expect(policy.shouldRetry(1, { code: "TIMEOUT", message: "x", retriable: true })).toBe(false);
    });

    it("toConnectorError should extract status code", () => {
      const error = toConnectorError({ status: 429, message: "Rate limited" });
      expect(error.statusCode).toBe(429);
      expect(error.retriable).toBe(true);
    });
  });

  // ── Rate Limiter ────────────────────────────────────────
  describe("RateLimiter", () => {
    it("NoopRateLimiter should not block", async () => {
      const limiter = createNoopRateLimiter();
      await limiter.acquire(); // should resolve immediately
    });
  });

  // ── Checkpoint ──────────────────────────────────────────
  describe("CheckpointSerializer", () => {
    it("StringCheckpointSerializer should pass through", () => {
      const serializer = createStringCheckpointSerializer();
      expect(serializer.serialize("abc")).toBe("abc");
      expect(serializer.deserialize("abc")).toBe("abc");
    });

    it("JsonCheckpointSerializer should round-trip objects", () => {
      const serializer = createJsonCheckpointSerializer<{ page: number; offset: number }>();
      const cursor = { page: 3, offset: 60 };
      const serialized = serializer.serialize(cursor);
      const deserialized = serializer.deserialize(serialized);
      expect(deserialized).toEqual(cursor);
    });
  });

  // ── Errors ──────────────────────────────────────────────
  describe("Errors", () => {
    it("fromHttpStatus should map 429 to RATE_LIMIT", () => {
      const error = fromHttpStatus(429, "Too Many Requests", "https://api.example.com");
      expect(error.code).toBe("RATE_LIMIT");
      expect(error.retriable).toBe(true);
    });

    it("fromHttpStatus should map 401 to AUTH", () => {
      const error = fromHttpStatus(401, "Unauthorized", "https://api.example.com");
      expect(error.code).toBe("AUTH");
      expect(error.retriable).toBe(false);
    });

    it("fromHttpStatus should map 500 to NETWORK (retriable)", () => {
      const error = fromHttpStatus(500, "Internal Server Error", "https://api.example.com");
      expect(error.retriable).toBe(true);
    });

    it("ConnectorErrors.rateLimited should include retryAfter", () => {
      const error = ConnectorErrors.rateLimited(30);
      expect(error.message).toContain("30");
    });
  });

  // ── Metrics ─────────────────────────────────────────────
  describe("Metrics", () => {
    it("should track requests, retries, and products", () => {
      const collector = createConnectorMetricsCollector();
      collector.recordRequest(100, true);
      collector.recordRequest(200, false);
      collector.recordRetry();
      collector.recordProducts(5);

      const snapshot = collector.snapshot();
      expect(snapshot.requestsExecuted).toBe(2);
      expect(snapshot.requestsSucceeded).toBe(1);
      expect(snapshot.requestsFailed).toBe(1);
      expect(snapshot.retriesAttempted).toBe(1);
      expect(snapshot.productsDiscovered).toBe(5);
      expect(snapshot.totalDurationMs).toBe(300);
    });

    it("should reset", () => {
      const collector = createConnectorMetricsCollector();
      collector.recordRequest(100, true);
      collector.reset();
      expect(collector.snapshot().requestsExecuted).toBe(0);
    });
  });
});
