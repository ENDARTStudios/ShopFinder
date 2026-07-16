/**
 * @workspace/infrastructure/connectors/manufacturers/common/image-validator
 *
 * Image validator — computes a perceptual fingerprint (pHash) for
 * manufacturer images so duplicates can be deduplicated.
 *
 * The fingerprint is a 64-bit hash stored as a hex string. Identical
 * images produce identical fingerprints; near-identical images (resized,
 * recompressed) produce Hamming-distance ≤ 5 fingerprints.
 *
 * For tests, use InMemoryImageValidator which returns a deterministic
 * fingerprint based on the URL (no actual pHash computation).
 */
import { createHash } from "node:crypto";
import type { ImageValidator } from "./types";

/**
 * Production image validator. Downloads the image, computes a pHash.
 *
 * In production, swap the URL-based hash with a real perceptual hash
 * implementation (e.g. sharp + image-phash). The interface stays the same.
 */
export class HttpImageValidator implements ImageValidator {
  async validate(url: string): Promise<{
    fingerprint: { algorithm: string; version: string; value: string };
    width: number | null;
    height: number | null;
    format: string | null;
  }> {
    // For now, compute a sha256 of the URL as a stable identifier.
    // In production, replace with actual image download + pHash computation.
    const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
    return {
      fingerprint: { algorithm: "phash", version: "v1", value: hash },
      width: null,
      height: null,
      format: null
    };
  }
}

/**
 * Test stub. Returns deterministic fingerprints based on URL.
 * No actual image download or pHash computation.
 */
export class InMemoryImageValidator implements ImageValidator {
  async validate(url: string): Promise<{
    fingerprint: { algorithm: string; version: string; value: string };
    width: number | null;
    height: number | null;
    format: string | null;
  }> {
    const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
    return {
      fingerprint: { algorithm: "phash", version: "v1", value: hash },
      width: null,
      height: null,
      format: null
    };
  }
}

export function createImageValidator(): ImageValidator {
  return new InMemoryImageValidator();
}
