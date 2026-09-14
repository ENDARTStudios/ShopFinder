/**
 * @workspace/domain/discovery/evaluation
 *
 * Barrel exports for AI Evaluation (A2.8).
 *
 * Design principle: Separate Inference from Evaluation.
 *   - InferenceProvider knows the model (OpenAI, Ollama, Gemini, vLLM)
 *   - DecisionProvider transforms raw output → deterministic EvaluationResult
 *   - PolicyEngine decides final approval (publish | review | reject)
 *
 * Compliance PreCheck runs BEFORE inference to avoid wasting model calls.
 * InferenceCache avoids re-running when nothing changed.
 *
 * Layout:
 *   types.ts               — 4 artifacts (InferenceArtifact, EvaluationResult, DecisionTrace, ApprovalDecision)
 *   scores.ts              — ProductScore 9-component composition
 *   inference-provider.ts  — InferenceProvider interface + StubInferenceProvider
 *   decision-provider.ts   — DecisionProvider (deterministic transform)
 *   cache.ts               — InferenceCache (key = product+model+prompt+schema versions)
 *   policy.ts              — PolicyEngine + 4 default rules
 *   compliance-check.ts    — CompliancePreCheck (5 rules, runs before inference)
 *   events.ts              — 5 events (InferenceStarted/Completed, EvaluationCompleted/Cached/Rejected)
 *   repository.ts          — In-memory EvaluationRepository (append-only)
 *   coordinator.ts         — EvaluationCoordinator (PreCheck→cache→inference→decision→policy→events)
 *   evaluation.test.ts     — Tests covering all 10 acceptance criteria
 */

export * from "./types";
export * from "./scores";
export * from "./inference-provider";
export * from "./decision-provider";
export * from "./cache";
export * from "./policy";
export * from "./compliance-check";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
