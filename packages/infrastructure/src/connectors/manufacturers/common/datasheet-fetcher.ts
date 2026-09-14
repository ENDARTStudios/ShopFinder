/**
 * @workspace/infrastructure/connectors/manufacturers/common/datasheet-fetcher
 *
 * Datasheet fetcher — downloads manufacturer datasheets (PDF) to ObjectStorage
 * and returns the object key + content hash.
 *
 * Decouples datasheet hosting from the manufacturer's CDN (which may rate-
 * limit or expire URLs). After fetching, the ManufacturerSource.downloads
 * array references the object key, not the manufacturer URL.
 *
 * For tests, use InMemoryDatasheetFetcher which records fetches without
 * actually downloading anything.
 */
import type { DatasheetFetcher } from "./types";
import { createHash } from "node:crypto";

/**
 * Production datasheet fetcher. Uses fetch() to download the PDF, then
 * stores it in ObjectStorage (passed in as a generic store function).
 */
export class ObjectStorageDatasheetFetcher implements DatasheetFetcher {
  constructor(
    private readonly store: (objectKey: string, content: Uint8Array, mimeType: string) => Promise<void>
  ) {}

  async fetch(url: string, mimeType: string): Promise<{
    objectKey: string;
    sizeBytes: number;
    sha256: string;
  }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch datasheet ${url}: ${response.status}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    // Object key: datasheets/<sha256-prefix>/<sha256>.<ext>
    const ext = mimeType === "application/pdf" ? "pdf" : "bin";
    const objectKey = `datasheets/${sha256.slice(0, 2)}/${sha256}.${ext}`;

    await this.store(objectKey, bytes, mimeType);
    return { objectKey, sizeBytes: bytes.length, sha256 };
  }
}

/**
 * Test stub. Records all fetches without downloading anything.
 * Returns deterministic object keys based on the URL hash.
 */
export class InMemoryDatasheetFetcher implements DatasheetFetcher {
  public readonly fetched = new Array<{ url: string; mimeType: string; objectKey: string }>();

  async fetch(url: string, mimeType: string): Promise<{
    objectKey: string;
    sizeBytes: number;
    sha256: string;
  }> {
    // Deterministic fake sha256 from URL
    const fakeHash = createHash("sha256").update(url).digest("hex");
    const ext = mimeType === "application/pdf" ? "pdf" : "bin";
    const objectKey = `datasheets/${fakeHash.slice(0, 2)}/${fakeHash}.${ext}`;

    this.fetched.push({ url, mimeType, objectKey });

    return {
      objectKey,
      sizeBytes: 1024, // fake size
      sha256: fakeHash
    };
  }
}

export function createDatasheetFetcher(
  store?: (objectKey: string, content: Uint8Array, mimeType: string) => Promise<void>
): DatasheetFetcher {
  if (store) return new ObjectStorageDatasheetFetcher(store);
  return new InMemoryDatasheetFetcher();
}
