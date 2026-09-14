/**
 * @workspace/infrastructure/connectors/core/fixture-repository
 *
 * FixtureRepository — filesystem abstraction for recorded HTTP interactions.
 *
 * Neither RecordingTransport nor ReplayTransport should know about the
 * filesystem. The FixtureRepository handles:
 *   - Writing recordings to versioned directories
 *   - Reading recordings for replay
 *   - Metadata management (provider, version, recordedAt, etc.)
 *
 * Directory structure:
 *   fixtures/
 *     aliexpress/
 *       affiliate-query/
 *         2026-07-13/
 *           page-001.json
 *           page-002.json
 *           metadata.json
 */
import type { RecordedInteraction } from "./transport";
export type { RecordedInteraction };
import type { MarketplaceProvider } from "./types";

// ── Types ──────────────────────────────────────────────────

export interface FixtureMetadata {
  readonly provider: MarketplaceProvider;
  readonly providerVersion: string;
  readonly recordedAt: string; // ISO
  readonly endpoint: string;
  readonly pages: number;
  readonly traceId?: string;
  readonly sdkVersion: string;
  readonly description?: string;
}

export interface FixtureSet {
  readonly metadata: FixtureMetadata;
  readonly interactions: ReadonlyArray<RecordedInteraction>;
}

// ── Interface ──────────────────────────────────────────────

export interface FixtureRepository {
  /**
   * Save a set of recorded interactions with metadata.
   * Returns the path/identifier where fixtures were saved.
   */
  save(
    provider: MarketplaceProvider,
    endpoint: string,
    interactions: ReadonlyArray<RecordedInteraction>,
    metadata: Omit<FixtureMetadata, "provider" | "pages" | "recordedAt">
  ): Promise<string>;

  /**
   * Load the latest fixture set for a provider + endpoint.
   */
  loadLatest(
    provider: MarketplaceProvider,
    endpoint: string
  ): Promise<FixtureSet | null>;

  /**
   * Load a specific fixture set by date.
   */
  loadByDate(
    provider: MarketplaceProvider,
    endpoint: string,
    date: string // yyyy-mm-dd
  ): Promise<FixtureSet | null>;

  /**
   * List all available fixture dates for a provider + endpoint.
   */
  listDates(
    provider: MarketplaceProvider,
    endpoint: string
  ): Promise<ReadonlyArray<string>>;
}

// ── Filesystem implementation ──────────────────────────────

export class FilesystemFixtureRepository implements FixtureRepository {
  constructor(
    private readonly basePath: string,
    private readonly sdkVersion: string = "1.0.0"
  ) {}

  async save(
    provider: MarketplaceProvider,
    endpoint: string,
    interactions: ReadonlyArray<RecordedInteraction>,
    metadata: Omit<FixtureMetadata, "provider" | "pages" | "recordedAt">
  ): Promise<string> {
    const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    const dir = `${this.basePath}/${provider}/${endpoint}/${date}`;

    // Create directory (Node.js fs)
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(dir, { recursive: true });

    // Save each interaction as a separate page file
    for (let i = 0; i < interactions.length; i++) {
      const filename = `page-${String(i + 1).padStart(3, "0")}.json`;
      const filepath = `${dir}/${filename}`;
      await writeFile(filepath, JSON.stringify(interactions[i], null, 2), "utf8");
    }

    // Save metadata
    const fullMetadata: FixtureMetadata = {
      ...metadata,
      provider,
      pages: interactions.length,
      recordedAt: new Date().toISOString()
    };
    await writeFile(`${dir}/metadata.json`, JSON.stringify(fullMetadata, null, 2), "utf8");

    return dir;
  }

  async loadLatest(
    provider: MarketplaceProvider,
    endpoint: string
  ): Promise<FixtureSet | null> {
    const dates = await this.listDates(provider, endpoint);
    if (dates.length === 0) return null;

    // Get the latest date (sorted descending)
    const latestDate = [...dates].sort().reverse()[0]!;
    return this.loadByDate(provider, endpoint, latestDate);
  }

  async loadByDate(
    provider: MarketplaceProvider,
    endpoint: string,
    date: string
  ): Promise<FixtureSet | null> {
    const { readdir, readFile } = await import("node:fs/promises");
    const dir = `${this.basePath}/${provider}/${endpoint}/${date}`;

    try {
      const files = await readdir(dir);
      const interactions: RecordedInteraction[] = [];
      let metadata: FixtureMetadata | null = null;

      for (const file of files.sort()) {
        if (file === "metadata.json") {
          const content = await readFile(`${dir}/${file}`, "utf8");
          metadata = JSON.parse(content) as FixtureMetadata;
        } else if (file.startsWith("page-") && file.endsWith(".json")) {
          const content = await readFile(`${dir}/${file}`, "utf8");
          interactions.push(JSON.parse(content) as RecordedInteraction);
        }
      }

      if (!metadata) return null;

      return { metadata, interactions };
    } catch {
      return null;
    }
  }

  async listDates(
    provider: MarketplaceProvider,
    endpoint: string
  ): Promise<ReadonlyArray<string>> {
    const { readdir } = await import("node:fs/promises");
    const dir = `${this.basePath}/${provider}/${endpoint}`;

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
    } catch {
      return [];
    }
  }
}

// ── Factory ────────────────────────────────────────────────

export function createFixtureRepository(
  basePath: string,
  sdkVersion?: string
): FixtureRepository {
  return new FilesystemFixtureRepository(basePath, sdkVersion);
}
