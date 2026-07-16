/**
 * @workspace/infrastructure/connectors/core/transport
 *
 * HttpTransport implementations:
 *   - FetchTransport: uses the fetch API (Node 18+ / Bun)
 *   - ReplayTransport: replays recorded HTTP responses for deterministic CI
 *
 * The transport is the ONLY component that makes network calls.
 * Swapping fetch → undici → proxy → mock is a one-line change.
 */
import type { HttpTransport, HttpRequest, HttpResponse } from "./types";

// ── FetchTransport ─────────────────────────────────────────

export class FetchTransport implements HttpTransport {
  readonly name = "fetch";

  async execute(request: HttpRequest): Promise<HttpResponse> {
    const url = new URL(request.url);
    if (request.query) {
      for (const [k, v] of Object.entries(request.query)) {
        url.searchParams.set(k, v);
      }
    }

    const start = Date.now();
    const response = await fetch(url.toString(), {
      method: request.method,
      headers: request.headers as Record<string, string>,
      body: request.body,
      signal: AbortSignal.timeout(request.timeoutMs)
    });

    const body = await response.text();
    const durationMs = Date.now() - start;

    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => { headers[k] = v; });

    return {
      status: response.status,
      headers,
      body,
      durationMs
    };
  }
}

// ── ReplayTransport ────────────────────────────────────────

/**
 * ReplayTransport replays recorded HTTP responses for deterministic CI.
 *
 * Usage:
 *   1. Record phase: use FetchTransport with RecordingWrapper.
 *      Responses are saved to JSON files.
 *   2. Replay phase: use ReplayTransport with the saved recordings.
 *      Same requests → same responses, no network needed.
 *
 * This enables:
 *   - Deterministic tests (same input → same output)
 *   - CI without external API dependencies
 *   - Reproducible regression tests
 *   - Offline development
 */

export interface RecordedInteraction {
  readonly request: {
    readonly method: string;
    readonly url: string;
    readonly query?: Readonly<Record<string, string>>;
  };
  readonly response: HttpResponse;
}

export class ReplayTransport implements HttpTransport {
  readonly name = "replay";
  private interactions: Map<string, HttpResponse[]>;
  private callIndex = 0;
  private keyCallIndex = new Map<string, number>();

  constructor(recordings: ReadonlyArray<RecordedInteraction>) {
    this.interactions = new Map();
    for (const r of recordings) {
      const key = this.makeKey(r.request.method, r.request.url, r.request.query);
      const existing = this.interactions.get(key) ?? [];
      existing.push(r.response);
      this.interactions.set(key, existing);
    }
  }

  async execute(request: HttpRequest): Promise<HttpResponse> {
    // Try exact match first (key = method:pathname:search)
    const key = this.makeKey(request.method, request.url, request.query);
    const responses = this.interactions.get(key);

    if (responses && responses.length > 0) {
      // If multiple responses for the same key, return them in order
      const idx = this.keyCallIndex.get(key) ?? 0;
      if (idx < responses.length) {
        const response = responses[idx]!;
        this.keyCallIndex.set(key, idx + 1);
        return { ...response };
      }
    }

    // Fallback: sequential match across ALL recordings
    const allResponses = [...this.interactions.values()].flat();
    if (this.callIndex < allResponses.length) {
      const response = allResponses[this.callIndex]!;
      this.callIndex++;
      return { ...response };
    }

    throw new Error(
      `ReplayTransport: no recorded response for ${request.method} ${request.url}` +
      ` (call #${this.callIndex}, ${allResponses.length} recordings available)`
    );
  }

  private makeKey(
    method: string,
    url: string,
    query?: Readonly<Record<string, string>>
  ): string {
    const urlObj = new URL(url, "http://replay.local");
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        urlObj.searchParams.set(k, v);
      }
    }
    return `${method}:${urlObj.pathname}:${urlObj.search}`;
  }

  /** Load recordings from a JSON string. */
  static fromJson(json: string): ReplayTransport {
    const data = JSON.parse(json) as RecordedInteraction[];
    return new ReplayTransport(data);
  }

  /** Load recordings from an array of interactions. */
  static fromArray(interactions: ReadonlyArray<RecordedInteraction>): ReplayTransport {
    return new ReplayTransport(interactions);
  }
}

// ── Recording wrapper ──────────────────────────────────────

/**
 * Wraps any HttpTransport and records all interactions.
 * Use during development to capture real API responses,
 * then use ReplayTransport in CI with the saved recordings.
 */
export class RecordingTransport implements HttpTransport {
  readonly name: string;
  private readonly inner: HttpTransport;
  private recordings: RecordedInteraction[] = [];

  constructor(inner: HttpTransport) {
    this.inner = inner;
    this.name = `recording(${inner.name})`;
  }

  async execute(request: HttpRequest): Promise<HttpResponse> {
    const response = await this.inner.execute(request);
    this.recordings.push({
      request: {
        method: request.method,
        url: request.url,
        query: request.query
      },
      response
    });
    return response;
  }

  getRecordings(): ReadonlyArray<RecordedInteraction> {
    return [...this.recordings];
  }

  toJson(): string {
    return JSON.stringify(this.recordings, null, 2);
  }
}

// ── Factories ──────────────────────────────────────────────

export function createFetchTransport(): HttpTransport {
  return new FetchTransport();
}

export function createReplayTransport(
  recordings: ReadonlyArray<RecordedInteraction>
): ReplayTransport {
  return new ReplayTransport(recordings);
}

export function createRecordingTransport(inner: HttpTransport): RecordingTransport {
  return new RecordingTransport(inner);
}
