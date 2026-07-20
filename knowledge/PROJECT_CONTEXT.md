# Project Context — ShopFinder

## Purpose

ShopFinder is a **Product Knowledge Graph** platform. It discovers, consolidates, enriches, evaluates, and publishes products from multiple data sources (marketplaces, distributors, retailers, manufacturers). The catalog is a projection of the knowledge graph — not the source of truth.

## Positioning

> ShopFinder is a Catalog Intelligence Platform based on AI that transforms heterogeneous product data into a canonical, enriched, validated catalog ready for distribution across multiple channels.

## What it is

- A **discovery engine** that finds product offers across 7+ suppliers (Amazon, Newegg, eBay, AliExpress, DigiKey, Intel, AMD)
- A **consolidation engine** that merges duplicate offers into canonical products via similarity clustering and resolution
- An **enrichment engine** that augments canonical products with official manufacturer data (specs, datasheets, lifecycle, certifications)
- An **intelligence engine** where AI evaluates products on 9 independent score components, and the PolicyEngine makes the final decision
- A **knowledge graph** where manufacturers, products, brands, categories, attributes, evidence, and connectors are typed nodes connected by typed edges
- A **distribution platform** where the enriched catalog feeds multiple consumers (stores, marketplaces, ERPs, PIMs, APIs, BI, search engines, LLMs)

## What it is NOT

- Not a storefront — it does not process payments or handle checkout
- Not a single-supplier tool — it aggregates across suppliers
- Not a manual catalog — products come from the pipeline, not from human entry
- Not a documentation site — the landing page is product-discovery-first, not technical-docs-first
- Not a framework — it is a product with a specific domain (hardware + electronics + consumer)

## Business rules

1. **AI is advisory. Policies are authoritative.** The AI never decides alone; the PolicyEngine approves every decision.
2. **Source Authority pyramid**: Manufacturer (100) > Distributor (90) > Retailer (80) > Marketplace (70). When sources conflict, higher authority wins.
3. **Immutability**: artifacts are never modified. Reprocessing creates new versions with `parentTraceId`.
4. **Separation of concerns**: Discovery connectors find offers; Manufacturer connectors enrich products. They never cross boundaries.
5. **Catalog is static**: pricing, ranking, and publication are projections — they never mutate the catalog.
6. **77 manufacturers** across 4 tiers (A/B/C/D) with per-attribute authority and per-segment coverage.
7. **Chinese manufacturers are first-class citizens**: 35 Tier C manufacturers (Colorful, Huananzhi, DeepCool, etc.) with multilingual aliases.

## Target audience

1. **Operators** — supervise the pipeline, approve `review` items, resolve conflicts
2. **Channel managers** — configure publication destinations, pricing strategy, monitor metrics
3. **Data engineers** — add connectors, reprocess traces, debug failures
4. **API consumers** — ERPs, PIMs, marketplaces, BI, search engines, LLMs that consume the catalog

## Slogan

`compra inteligente` (always lowercase)

## Version

0.6.0 — Copyright © 2026 END ART
