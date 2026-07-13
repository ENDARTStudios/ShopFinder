/**
 * @workspace/domain/discovery/similarity/algorithms
 *
 * 5 similarity algorithms for comparing NormalizedProductRecords.
 *
 * Each algorithm is a pure function returning a 0-1 score.
 * The SimilarityAlgorithm interface lets us swap implementations
 * (e.g. from Levenshtein to embeddings) without changing callers.
 */
import type { SimilarityAlgorithm } from "./types";

/**
 * Default similarity algorithm using:
 *   - Title: Levenshtein-based ratio
 *   - Brand: exact match (1.0) or canonical ID match (1.0) or 0
 *   - Image: Hamming distance on fingerprints
 *   - Attribute: Jaccard on canonical name+value pairs
 *   - Price: band match (1.0 if same band, 0.5 if adjacent, 0 otherwise)
 */
export class DefaultSimilarityAlgorithm implements SimilarityAlgorithm {
  readonly name = "default-v1";

  compareTitle(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1;
    return levenshteinRatio(a.toLowerCase(), b.toLowerCase());
  }

  compareBrand(
    a: string,
    b: string,
    canonicalA?: string | null,
    canonicalB?: string | null
  ): number {
    if (!a || !b) return 0;
    if (a === b) return 1;
    // Canonical IDs match → same brand entity
    if (canonicalA && canonicalB && canonicalA === canonicalB) return 1;
    // Case-insensitive match
    if (a.toLowerCase() === b.toLowerCase()) return 1;
    // UNKNOWN brand → can't confirm similarity
    if (a === "UNKNOWN" || b === "UNKNOWN") return 0;
    return levenshteinRatio(a.toLowerCase(), b.toLowerCase());
  }

  compareImages(
    a: ReadonlyArray<{ fingerprint: { value: string; algorithm: string } }>,
    b: ReadonlyArray<{ fingerprint: { value: string; algorithm: string } }>
  ): number {
    if (a.length === 0 || b.length === 0) return 0;
    // Compare all image pairs, return the maximum similarity
    let maxSim = 0;
    for (const imgA of a) {
      for (const imgB of b) {
        // Only compare fingerprints with the same algorithm
        if (imgA.fingerprint.algorithm !== imgB.fingerprint.algorithm) continue;
        const sim =
          1 -
          hammingDistance(imgA.fingerprint.value, imgB.fingerprint.value) /
            Math.max(imgA.fingerprint.value.length, imgB.fingerprint.value.length);
        if (sim > maxSim) maxSim = sim;
      }
    }
    return maxSim;
  }

  compareAttributes(
    a: ReadonlyArray<{ name: string; value: string }>,
    b: ReadonlyArray<{ name: string; value: string }>
  ): number {
    if (a.length === 0 || b.length === 0) return 0;
    // Jaccard similarity on (name, value) pairs
    const setA = new Set(a.map((x) => `${x.name}:${x.value}`.toLowerCase()));
    const setB = new Set(b.map((x) => `${x.name}:${x.value}`.toLowerCase()));
    let intersection = 0;
    for (const v of setA) {
      if (setB.has(v)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  comparePrice(a: { band: string }, b: { band: string }): number {
    if (!a?.band || !b?.band) return 0;
    if (a.band === b.band) return 1;
    // Adjacent bands → 0.5 similarity
    const bands = [
      "0-10",
      "10-20",
      "20-50",
      "50-100",
      "100-250",
      "250-500",
      "500-1000",
      "1000-2500",
      "2500-5000",
      "5000+"
    ];
    const idxA = bands.indexOf(a.band);
    const idxB = bands.indexOf(b.band);
    if (idxA < 0 || idxB < 0) return 0;
    const diff = Math.abs(idxA - idxB);
    if (diff === 1) return 0.5;
    if (diff === 2) return 0.25;
    return 0;
  }
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Levenshtein distance ratio: 1 - (distance / max(len)).
 * Returns 1 for identical strings, 0 for completely different.
 */
function levenshteinRatio(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use a single array for DP (space optimization)
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }

  return prev[n];
}

/**
 * Character-level Hamming distance.
 * For unequal-length strings, pads the shorter with zeros.
 */
function hammingDistance(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < maxLen; i++) {
    const ca = a[i] ?? "\0";
    const cb = b[i] ?? "\0";
    if (ca !== cb) dist++;
  }
  return dist;
}

export function createDefaultSimilarityAlgorithm(): SimilarityAlgorithm {
  return new DefaultSimilarityAlgorithm();
}
