/**
 * ReplayTransport — returns fixture data from the filesystem.
 *
 * The fixture file is resolved as:
 *   <fixtureDir>/<method>_<path-with-slashes-replaced-by-_>.json
 *
 * e.g. `GET /search?q=electronics` → `<fixtureDir>/get_search_q_electronics.json`
 *      `GET /buy/browse/v1/item_summary/search` → `<fixtureDir>/get_buy_browse_v1_item_summary_search.json`
 *
 * Fixture envelope: `{ status?, headers?, body?, finalUrl? }` OR a raw body
 * (assumed 200). If the file contains `{ "body": ... }`, the transport
 * returns `body` as the response body; otherwise the entire parsed JSON is
 * the body.
 *
 * If the fixture file does not exist, the transport throws
 * `MissingFixtureError` — this is intentional so test failures surface
 * clearly rather than silently returning empty data.
 *
 * ReplayTransport is the default for sandbox and CI runs. It never makes
 * network calls.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import type { Transport, TransportRequest, TransportResponse } from "./Transport";

export interface ReplayTransportOptions {
  /** Absolute path to the directory holding fixture JSON files. */
  fixtureDir: string;
  /**
   * Optional predicate — if it returns false for a request, the transport
   * throws `MissingFixtureError` instead of returning a 404 body. Useful
   * in tests to catch unexpected calls.
   */
  allowRequest?: (req: TransportRequest) => boolean;
}

export class MissingFixtureError extends Error {
  constructor(
    public readonly fixturePath: string,
    public readonly request: TransportRequest
  ) {
    super(
      `ReplayTransport: no fixture for ${request.method ?? "GET"} ${request.path}. ` +
        `Expected file: ${fixturePath}`
    );
    this.name = "MissingFixtureError";
  }
}

function sanitizePath(p: string): string {
  // Replace slashes and other unsafe chars with underscores; trim leading slash.
  return p
    .replace(/^\//, "")
    .replace(/\?[^]*/, "") // strip query string if present in path
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export class ReplayTransport implements Transport {
  readonly kind = "replay";
  private readonly fixtureDir: string;
  private readonly allowRequest?: (req: TransportRequest) => boolean;

  constructor(opts: ReplayTransportOptions) {
    this.fixtureDir = path.resolve(opts.fixtureDir);
    this.allowRequest = opts.allowRequest;
  }

  async execute<T = unknown>(req: TransportRequest): Promise<TransportResponse<T>> {
    if (this.allowRequest && !this.allowRequest(req)) {
      throw new MissingFixtureError("(blocked by allowRequest)", req);
    }

    const method = (req.method ?? "GET").toLowerCase();
    const safePath = sanitizePath(req.path);
    const fixtureFile = path.join(this.fixtureDir, `${method}_${safePath}.json`);

    const start = Date.now();
    let raw: string;
    try {
      raw = await fs.promises.readFile(fixtureFile, "utf8");
    } catch {
      throw new MissingFixtureError(fixtureFile, req);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    // Fixture envelope: { status?, headers?, body? } OR a raw body (assumed 200).
    const envelope =
      parsed &&
      typeof parsed === "object" &&
      "body" in (parsed as Record<string, unknown>)
        ? (parsed as {
            status?: number;
            headers?: Record<string, string>;
            body?: unknown;
            finalUrl?: string;
          })
        : { status: 200, headers: {}, body: parsed };

    return {
      status: envelope.status ?? 200,
      headers: envelope.headers ?? {},
      body: envelope.body as T,
      source: "replay",
      durationMs: Date.now() - start,
      finalUrl: envelope.finalUrl
    };
  }
}
