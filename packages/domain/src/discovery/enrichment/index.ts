/**
 * @workspace/domain/discovery/enrichment
 *
 * Manufacturer Enrichment module — rich manufacturer domain model.
 *
 * Replaces the simple Tier A/B/C/D system with two independent axes:
 *   - AuthorityScore (0-100): how trustworthy the source is
 *   - CoverageScore (0-100): how complete the manufacturer's data is
 *
 * Each manufacturer is a full entity with:
 *   - Country of origin (US, TW, CN, JP, KR, DE, NL)
 *   - Segments (CPU, GPU, Motherboard, SSD, Memory, Cooling, etc.)
 *   - Multilingual aliases (English + Chinese characters + pinyin)
 *   - Commercial brands (separate from manufacturer entity)
 *   - Status (ACTIVE, DISCONTINUED, OEM, ODM)
 *   - Official domains (website, support, download center, datasheet base)
 *   - Supported certifications (CE, FCC, RoHS, UL, ANATEL, INMETRO, etc.)
 *
 * 77 manufacturers registered:
 *   Tier A (14): Intel, AMD, NVIDIA, Samsung, etc.
 *   Tier B (18): ASUS, MSI, Gigabyte, Dell, etc.
 *   Tier C (35): Colorful, Huananzhi, DeepCool, Jonsbo, etc.
 *   Tier D (10): Kllisre, Atermiter, SZCPU, etc.
 */

export * from "./types";
export * from "./registry";
