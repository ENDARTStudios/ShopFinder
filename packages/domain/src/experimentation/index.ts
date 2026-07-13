/** @workspace/domain/experimentation — A/B Testing */
export interface Experiment {
  readonly id: string;
  readonly name: string;
  readonly status: "draft" | "running" | "completed";
  readonly variants: ExperimentVariant[];
}
export interface ExperimentVariant {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
  readonly isControl: boolean;
}
export interface ExperimentResult {
  readonly experimentId: string;
  readonly variantId: string;
  readonly participants: number;
  readonly conversions: number;
  readonly confidence: number;
}
export interface ExperimentEngine {
  create(exp: Experiment): void;
  assign(experimentId: string, userId: string): ExperimentVariant;
  getResults(experimentId: string): ExperimentResult[];
}
