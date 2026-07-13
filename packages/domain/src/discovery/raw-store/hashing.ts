/**
 * @workspace/domain/discovery/raw-store/hashing
 *
 * Two-level hashing for RawProductRecord.
 *
 *   payloadHash  — FNV-1a over canonical JSON of the raw payload.
 *                  Exact byte-level identity. Used for:
 *                    - replay detection (same payload → skip)
 *                    - cache keys
 *                    - audit integrity
 *
 *   semanticHash — computed AFTER normalization (A2.5). Used for
 *                  deduplication by A2.7 Similarity. In A2.4 this
 *                  is always null — the column exists but is not
 *                  populated until the Normalizer runs.
 *
 * NEVER mix the two. payloadHash is about "did we see this exact
 * bytes before?" semanticHash is about "is this the same product
 * as another listing, despite different raw representations?"
 */

/**
 * Canonical JSON serialization — stable key order.
 * Ensures the same object always produces the same string,
 * regardless of property insertion order.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJsonStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
  return `{${pairs.join(",")}}`;
}

/**
 * FNV-1a 32-bit hash, two-pass for 64-bit-ish width.
 * Same algorithm as orchestrator's executionKey — consistent
 * across the codebase. Not crypto-secure; we need stable, fast,
 * synchronous hashing without BigInt (target is ES2017).
 */
export function computePayloadHash(payload: unknown): string {
  const json = canonicalJsonStringify(payload);
  let h1 = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h1 ^= json.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
  }
  let h2 = 0x84222325;
  for (let i = json.length - 1; i >= 0; i--) {
    h2 ^= json.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  h1 = Math.imul(h1 ^ h2, 0x01000193) >>> 0;
  h2 = Math.imul(h2 ^ h1, 0x01000193) >>> 0;
  return `ph_${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

/**
 * Semantic hash placeholder. In A2.4 this is always null.
 * A2.5 Normalizer will implement the real semantic hash based on:
 *   - canonicalized title
 *   - brand + category
 *   - key attributes (color, size, material)
 *   - price band
 *
 * This stub exists so the RawProductRecord.semanticHash field has
 * a clear contract: "null means not yet normalized."
 */
export function computeSemanticHash(_normalized: unknown): string | null {
  // Intentionally null in A2.4 — filled by A2.5 Normalizer.
  return null;
}
