/** @workspace/domain/planning — Planning (PolicyEngine, FeatureFlags, Workflow, SchemaRegistry, MultiTenancy) */
export interface PolicyEngine {
  evaluate<T>(policy: string, ctx: T): Promise<unknown>;
  registerPolicy(name: string, evaluator: (ctx: any) => Promise<unknown>): void;
}
export type FeatureFlag =
  | "ai_discovery"
  | "ai_evaluation"
  | "auto_approval"
  | "auto_publish"
  | "auto_reprice"
  | "auto_translation"
  | "auto_media"
  | "auto_ordering";
export interface FeatureFlagService {
  isEnabled(flag: FeatureFlag): boolean;
  enable(flag: FeatureFlag): void;
  disable(flag: FeatureFlag): void;
}
export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly steps: WorkflowStep[];
}
export interface WorkflowStep {
  readonly id: string;
  readonly name: string;
  readonly handler: string;
}
export interface WorkflowEngine {
  execute(def: WorkflowDefinition, inputs: Record<string, unknown>): Promise<unknown>;
}
export interface EventSchema {
  readonly schemaId: string;
  readonly schemaVersion: string;
  readonly eventType: string;
  readonly compatibility: string;
}
export interface SchemaRegistry {
  register(s: EventSchema): void;
  getActiveSchema(eventType: string): EventSchema | null;
}
export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly type: "single_brand" | "multi_brand" | "white_label" | "franchise" | "b2b";
}
export interface Organization {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
}
