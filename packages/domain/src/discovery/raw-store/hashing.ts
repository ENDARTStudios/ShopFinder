/**
 * @workspace/domain/discovery/raw-store/hashing
 *
 * Payload hashing for RawProductRecord.
 *
 *   payloadHash — FNV-1a over canonical JSON of the raw payload.
 *                 Exact byte-level identity. Used for:
 *                   - replay detection (same payload → skip)
 *                   - cache keys
 *                   - audit integrity
 *
 * semanticHash does NOT belong here — it is a derived value computed
 * by A2.5 Normalizer after attribute canonicalization. It lives on
 * NormalizedProductRecord, not on RawProductRecord. This keeps the
 * Raw Store strictly immutable: acquired data never gets enriched
 * with post-processing results.
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
