/**
 * @workspace/domain/discovery/enrichment/knowledge-graph
 *
 * Product Knowledge Graph — explicit typed nodes and edges.
 *
 * The catalog is a PROJECTION of this graph. The graph itself is the
 * source of truth: manufacturers, products, brands, categories, offers,
 * attributes, documents, certifications, and connectors are all nodes.
 * Relationships between them are typed edges.
 *
 * Edge types:
 *   manufactures        — Manufacturer → Product
 *   owns_brand          — Manufacturer → Brand
 *   belongs_to          — Product → Category
 *   supersedes          — Product → Product (newer replaces older)
 *   compatible_with     — Product → Product (e.g., CPU ↔ Motherboard)
 *   certified_by        — Product → Certification
 *   documents           — Document → Product (datasheet, manual)
 *   derived_from        — Attribute → AttributeEvidence
 *   published_by        — Offer → Supplier
 *   observed_in         — AttributeEvidence → Marketplace/Source
 *   references          — Document → Document
 *   has_attribute       — Product → ProductAttribute
 *   supported_by        — ProductAttribute → Document
 *   retrieved_by        — Document/Attribute → ConnectorInstance
 *   enriched_by         — Product → ManufacturerSource
 *   evaluated_by        — Product → AI Inference
 */
import type { BrandedId } from "../../shared";

// ── Node types ─────────────────────────────────────────────

export type KnowledgeNodeId = BrandedId<"KnowledgeNodeId">;

export type KnowledgeNodeType =
  | "manufacturer"
  | "product"
  | "brand"
  | "category"
  | "offer"
  | "connector_definition"
  | "connector_instance"
  | "product_attribute"
  | "attribute_evidence"
  | "information_source"
  | "certification"
  | "datasheet"
  | "document"
  | "ai_inference";

export interface KnowledgeNode {
  readonly id: KnowledgeNodeId;
  readonly type: KnowledgeNodeType;
  readonly label: string;             // human-readable: "Intel", "Core i9-14900K"
  readonly externalId: string;       // reference to the domain entity: "mfr_intel", "prod_i9_14900k"
  readonly properties: Readonly<Record<string, unknown>>;
}

// ── Edge types ─────────────────────────────────────────────

export type KnowledgeEdgeId = BrandedId<"KnowledgeEdgeId">;

export type KnowledgeEdgeType =
  | "manufactures"
  | "owns_brand"
  | "belongs_to"
  | "supersedes"
  | "compatible_with"
  | "certified_by"
  | "documents"
  | "derived_from"
  | "published_by"
  | "observed_in"
  | "references"
  | "has_attribute"
  | "supported_by"
  | "retrieved_by"
  | "enriched_by"
  | "evaluated_by";

export interface KnowledgeEdge {
  readonly id: KnowledgeEdgeId;
  readonly source: KnowledgeNodeId;
  readonly target: KnowledgeNodeId;
  readonly type: KnowledgeEdgeType;
  readonly weight: number;            // 0-1, edge confidence/strength
  readonly properties: Readonly<Record<string, unknown>>;
}

// ── Graph ──────────────────────────────────────────────────

export interface KnowledgeGraph {
  readonly nodes: ReadonlyArray<KnowledgeNode>;
  readonly edges: ReadonlyArray<KnowledgeEdge>;
}

// ── Helper functions ───────────────────────────────────────

export function node(params: {
  type: KnowledgeNodeType;
  label: string;
  externalId: string;
  properties?: Record<string, unknown>;
}): KnowledgeNode {
  return {
    id: `kn_${params.type}_${params.externalId}` as unknown as KnowledgeNodeId,
    type: params.type,
    label: params.label,
    externalId: params.externalId,
    properties: params.properties ?? {}
  };
}

export function edge(params: {
  source: KnowledgeNodeId;
  target: KnowledgeNodeId;
  type: KnowledgeEdgeType;
  weight?: number;
  properties?: Record<string, unknown>;
}): KnowledgeEdge {
  return {
    id: `ke_${params.type}_${params.source}_${params.target}` as unknown as KnowledgeEdgeId,
    source: params.source,
    target: params.target,
    type: params.type,
    weight: params.weight ?? 1.0,
    properties: params.properties ?? {}
  };
}

// ── Query helpers ──────────────────────────────────────────

export function getNeighbors(
  graph: KnowledgeGraph,
  nodeId: KnowledgeNodeId,
  edgeType?: KnowledgeEdgeType
): ReadonlyArray<KnowledgeNode> {
  const neighborIds = new Set<string>();
  for (const e of graph.edges) {
    if (e.source === nodeId && (!edgeType || e.type === edgeType)) {
      neighborIds.add(e.target as string);
    }
    if (e.target === nodeId && (!edgeType || e.type === edgeType)) {
      neighborIds.add(e.source as string);
    }
  }
  return graph.nodes.filter((n) => neighborIds.has(n.id as string));
}

export function getEdges(
  graph: KnowledgeGraph,
  nodeId: KnowledgeNodeId,
  edgeType?: KnowledgeEdgeType
): ReadonlyArray<KnowledgeEdge> {
  return graph.edges.filter(
    (e) => (e.source === nodeId || e.target === nodeId) && (!edgeType || e.type === edgeType)
  );
}

export function findNode(
  graph: KnowledgeGraph,
  externalId: string
): KnowledgeNode | null {
  return graph.nodes.find((n) => n.externalId === externalId) ?? null;
}

export function getGraphStats(graph: KnowledgeGraph): {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
} {
  const nodesByType: Record<string, number> = {};
  const edgesByType: Record<string, number> = {};
  for (const n of graph.nodes) {
    nodesByType[n.type] = (nodesByType[n.type] ?? 0) + 1;
  }
  for (const e of graph.edges) {
    edgesByType[e.type] = (edgesByType[e.type] ?? 0) + 1;
  }
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    nodesByType,
    edgesByType
  };
}
