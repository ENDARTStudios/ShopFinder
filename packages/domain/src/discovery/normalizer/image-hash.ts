/**
 * @workspace/domain/discovery/normalizer/image-hash
 *
 * Perceptual hash (phash) for image deduplication (R7).
 *
 * Unlike SHA-256 (exact byte match), phash produces similar hashes for
 * visually similar images. This enables deduplication of products that
 * use the same image with minor resizing/compression differences.
 *
 * The domain layer defines the interface and a deterministic stub.
 * The infrastructure layer (@workspace/integrations or @workspace/ai)
 * provides a real phash implementation backed by sharp/jimp or an AI
 * vision model.
 */

export interface ImageHasher {
  /**
   * Compute a perceptual hash for the image at the given URL.
   * Returns a hex string (typically 16 chars for a 64-bit phash).
   */
  computePhash(imageUrl: string): Promise<string>;

  /**
   * Compute SHA-256 of the image bytes (exact match).
   * Optional — some implementations may skip this for performance.
   */
  computeSha256?(imageUrl: string): Promise<string>;

  /**
   * Compute Hamming distance between two phashes.
   * 0 = identical, higher = more different.
   * Distance ≤ 5 typically means "same image" for 64-bit phash.
   */
  hammingDistance(phashA: string, phashB: string): number;

  readonly algorithm: string;
}

/**
 * Deterministic stub phash — computes a hash from the URL string itself.
 * NOT a real perceptual hash. Used for tests and initial development.
 * Production MUST swap in a real implementation.
 */
export class StubImageHasher implements ImageHasher {
  readonly algorithm = "stub-phash-v1";

  async computePhash(imageUrl: string): Promise<string> {
    // Deterministic hash from URL — NOT perceptual, just stable.
    let h1 = 0x811c9dc5;
    for (let i = 0; i < imageUrl.length; i++) {
      h1 ^= imageUrl.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
    }
    let h2 = 0x84222325;
    for (let i = imageUrl.length - 1; i >= 0; i--) {
      h2 ^= imageUrl.charCodeAt(i);
      h2 = Math.imul(h2, 0x01000193) >>> 0;
    }
    h1 = Math.imul(h1 ^ h2, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ h1, 0x01000193) >>> 0;
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  }

  hammingDistance(phashA: string, phashB: string): number {
    // For the stub, distance is character-level difference.
    // Real phash uses bit-level Hamming distance.
    if (phashA.length !== phashB.length) return Math.max(phashA.length, phashB.length);
    let dist = 0;
    for (let i = 0; i < phashA.length; i++) {
      if (phashA[i] !== phashB[i]) dist++;
    }
    return dist;
  }
}

let _default: ImageHasher | null = null;

export function getDefaultImageHasher(): ImageHasher {
  if (!_default) _default = new StubImageHasher();
  return _default;
}

export function setDefaultImageHasher(hasher: ImageHasher): void {
  _default = hasher;
}

export function createStubImageHasher(): ImageHasher {
  return new StubImageHasher();
}
