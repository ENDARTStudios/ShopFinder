/** @workspace/domain/attributes — Canonical attributes + Quality Score */
export interface CanonicalAttribute {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly synonyms: string[];
  readonly isFilterable: boolean;
}
export interface AttributeDictionary {
  mapAttribute(provider: string, name: string): CanonicalAttribute | null;
}
export interface AttributeNormalizer {
  normalize(attr: CanonicalAttribute, raw: string): { normalized: string; confidence: number };
}
export interface QualityScore {
  readonly overall: number;
  readonly factors: {
    imageQuality: number;
    descriptionQuality: number;
    attributeCompleteness: number;
  };
  readonly issues: QualityIssue[];
}
export interface QualityIssue {
  readonly field: string;
  readonly severity: "critical" | "warning" | "info";
  readonly message: string;
  readonly autoFixable: boolean;
}
