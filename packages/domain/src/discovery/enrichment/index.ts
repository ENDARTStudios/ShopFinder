/**
 * @workspace/domain/discovery/enrichment
 *
 * Product Knowledge Graph — Knowledge Source Management System.
 *
 * The ShopFinder operates over a Product Knowledge Graph where the
 * catalog is a projection, not the source of truth.
 *
 * Aggregates:
 *   - Manufacturer (identity, authority, coverage, capabilities, certifications)
 *   - ConnectorDefinition (template: protocol, endpoint, auth, capabilities)
 *   - ConnectorInstance (runtime: environment, health, sync state)
 *   - ProductAttribute (conclusion with AttributeEvidence[])
 *   - AttributeEvidence (single source observation)
 *   - InformationSource (raw source metadata)
 *   - ManufacturerVersion (immutable history)
 *   - AuthorityPolicy (dynamic authority resolution)
 *   - ConfidenceScore (multi-dimensional: manufacturer, consensus, freshness, parser, ai)
 *   - DecisionExplanation (structured audit trail)
 *
 * Ontology:
 *   - AttributeDefinition (canonical IDs: cpu.socket, gpu.memory, etc.)
 *   - resolveAttribute(rawName) → AttributeDefinition
 *
 * Knowledge Graph:
 *   - KnowledgeNode (typed: manufacturer, product, brand, category, offer, etc.)
 *   - KnowledgeEdge (typed: manufactures, owns_brand, compatible_with, etc.)
 *   - Query helpers: getNeighbors, getEdges, findNode, getGraphStats
 */

export * from "./types";
export * from "./registry";
export * from "./ontology";
export * from "./knowledge-graph";
