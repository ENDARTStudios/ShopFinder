/**
 * @workspace/infrastructure/connectors/manufacturers/common/spec-parser
 *
 * Shared utilities for parsing manufacturer specification pages.
 *
 * Each manufacturer connector has its own parser that knows the shape
 * of its manufacturer's API response (Intel Ark JSON, AMD API JSON,
 * NVIDIA product page HTML, etc.). This module provides common helpers
 * those parsers compose:
 *
 *   - parseNumericSpec("125 W")  → { value: "125", unit: "W" }
 *   - parseDimensionSpec("45×45×5 mm") → { value: "45×45×5", unit: "mm" }
 *   - normalizeSpecName("TDP (Watt)") → "tdp"
 *   - canonicalLifecycleStatus("End of Life") → "end_of_life"
 *   - matchMpn("BX8071514900K", "Intel Core i9-14900K") → "BX8071514900K"
 *
 * These helpers are deterministic and side-effect free.
 */

// ── Numeric spec parsing ───────────────────────────────────

/**
 * Parse a spec value like "125 W", "3.2 GHz", "1000 MB" into value + unit.
 * Returns { value, unit } where unit may be null for unitless specs.
 *
 * Examples:
 *   parseNumericSpec("125 W")      → { value: "125",   unit: "W" }
 *   parseNumericSpec("3.2 GHz")    → { value: "3.2",   unit: "GHz" }
 *   parseNumericSpec("LGA1700")    → { value: "LGA1700", unit: null }
 *   parseNumericSpec("1000 MB/s")  → { value: "1000",  unit: "MB/s" }
 */
export function parseNumericSpec(raw: string): { value: string; unit: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: "", unit: null };

  // Match leading number (integer or decimal) followed by optional unit
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if (match) {
    const [, num, unit] = match;
    return { value: num!, unit: unit && unit.length > 0 ? unit! : null };
  }

  // Non-numeric value (e.g. "LGA1700", "Yes", "Dual Channel")
  return { value: trimmed, unit: null };
}

/**
 * Parse a dimension spec like "45×45×5 mm" or "45 x 45 x 5 mm".
 * Preserves the original string value but extracts the unit.
 */
export function parseDimensionSpec(raw: string): { value: string; unit: string | null } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.+?)\s*(mm|cm|m|in|inch|inches)$/i);
  if (match) {
    const [, value, unit] = match;
    return { value: value!.trim(), unit: unit!.toLowerCase() };
  }
  return { value: trimmed, unit: null };
}

// ── Spec name normalization ────────────────────────────────

/**
 * Normalize a spec name for cross-source matching.
 *   - lowercase
 *   - strip parenthesized units: "TDP (Watt)" → "tdp"
 *   - collapse whitespace
 *   - strip trailing punctuation
 *
 * Used by the EnrichmentPolicy to match manufacturer specs against
 * marketplace attributes by name.
 */
export function normalizeSpecName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ") // strip parenthesized units
    .replace(/\s+/g, " ")              // collapse whitespace
    .trim()
    .replace(/[:\-_]+$/g, "");         // strip trailing punctuation
}

// ── Lifecycle status canonicalization ──────────────────────

/**
 * Map manufacturer-specific lifecycle strings to the canonical
 * LifecycleStatus enum.
 *
 * Examples:
 *   "Active"               → "active"
 *   "End of Life"          → "end_of_life"
 *   "Discontinued"         → "discontinued"
 *   "Announced"            → "announced"
 *   "Obsolete"             → "obsolete"
 *   "" / null / undefined  → "unknown"
 */
export function canonicalLifecycleStatus(
  raw: string | null | undefined
): "active" | "announced" | "end_of_life" | "discontinued" | "obsolete" | "unknown" {
  if (!raw) return "unknown";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "") return "unknown";

  if (normalized === "active" || normalized === "in production" || normalized === "launched") {
    return "active";
  }
  if (normalized === "announced" || normalized === "pre-launch" || normalized === "coming soon") {
    return "announced";
  }
  if (normalized.includes("end of life") || normalized === "eol" || normalized.includes("end-of-life")) {
    return "end_of_life";
  }
  if (normalized === "discontinued" || normalized.includes("no longer")) {
    return "discontinued";
  }
  if (normalized === "obsolete" || normalized.includes("retired")) {
    return "obsolete";
  }
  return "unknown";
}

// ── MPN matching ───────────────────────────────────────────

/**
 * Decide whether a manufacturer-returned MPN matches the requested MPN.
 *
 * Strategy:
 *   1. Exact case-insensitive match → confirmed
 *   2. Manufacturer MPN starts with requested MPN → confirmed (suffix variant)
 *   3. Requested MPN appears in manufacturer title → confirmed
 *   4. Otherwise → null (no match)
 *
 * Returns the matched MPN (manufacturer's canonical form) or null.
 */
export function matchMpn(
  requestedMpn: string | null,
  manufacturerMpn: string | null,
  manufacturerTitle?: string
): string | null {
  if (!requestedMpn) return manufacturerMpn ?? null;
  if (!manufacturerMpn) return null;

  const req = requestedMpn.trim().toUpperCase();
  const man = manufacturerMpn.trim().toUpperCase();

  // 1. Exact match
  if (req === man) return manufacturerMpn;

  // 2. Prefix match (variant suffix)
  if (man.startsWith(req + "-") || man.startsWith(req + "/")) {
    return manufacturerMpn;
  }
  if (req.startsWith(man + "-") || req.startsWith(man + "/")) {
    return manufacturerMpn;
  }

  // 3. Title contains requested MPN
  if (manufacturerTitle && manufacturerTitle.toUpperCase().includes(req)) {
    return manufacturerMpn;
  }

  // 4. No match — return null so the coordinator can mark as not_found
  return null;
}

// ── Image kind classification ──────────────────────────────

/**
 * Classify an image URL/filename into a kind based on common patterns.
 *
 *   "primary"   — main product shot
 *   "angle"     — alternate angle
 *   "detail"    — close-up of a port/feature
 *   "diagram"   — block diagram / schematic
 *   "package"   — packaging shot
 *   "environmental" — in-use / lifestyle shot
 */
export function classifyImageKind(url: string): "primary" | "angle" | "detail" | "diagram" | "package" | "environmental" {
  const lower = url.toLowerCase();
  if (lower.includes("primary") || lower.includes("main") || lower.includes("front")) {
    return "primary";
  }
  if (lower.includes("angle") || lower.includes("side") || lower.includes("back")) {
    return "angle";
  }
  if (lower.includes("detail") || lower.includes("close") || lower.includes("port")) {
    return "detail";
  }
  if (lower.includes("diagram") || lower.includes("schematic") || lower.includes("block")) {
    return "diagram";
  }
  if (lower.includes("package") || lower.includes("box")) {
    return "package";
  }
  if (lower.includes("env") || lower.includes("lifestyle") || lower.includes("in-use")) {
    return "environmental";
  }
  // Default to primary for the first image; connector can override
  return "primary";
}

// ── Download kind classification ───────────────────────────

/**
 * Classify a download URL/title into a kind based on common patterns.
 */
export function classifyDownloadKind(
  url: string,
  title: string
): "datasheet" | "manual" | "driver" | "bios" | "firmware" | "certificate" | "other" {
  const text = `${title} ${url}`.toLowerCase();
  if (text.includes("datasheet") || text.includes("spec sheet") || text.endsWith(".pdf") && text.includes("spec")) {
    return "datasheet";
  }
  if (text.includes("manual") || text.includes("user guide")) {
    return "manual";
  }
  if (text.includes("driver")) {
    return "driver";
  }
  if (text.includes("bios")) {
    return "bios";
  }
  if (text.includes("firmware")) {
    return "firmware";
  }
  if (text.includes("certificate") || text.includes("certification") || text.includes("rohs") || text.includes("fcc")) {
    return "certificate";
  }
  return "other";
}

// ── MIME type inference ────────────────────────────────────

/**
 * Infer MIME type from a URL or filename.
 */
export function inferMimeType(url: string): string {
  const lower = url.toLowerCase().split("?")[0]!;
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".exe")) return "application/x-msdownload";
  if (lower.endsWith(".iso")) return "application/x-iso9660-image";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".xml")) return "application/xml";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  return "application/octet-stream";
}
