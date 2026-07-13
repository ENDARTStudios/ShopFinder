/**
 * @workspace/domain/discovery — Discovery Pipeline (modular)
 * Split into submodules per user recommendation to avoid circular imports.
 *
 * Submodules:
 *   types.ts       — All discovery contracts (jobs, signals, plans, events)
 *   planner.ts     — A2.1 Discovery Planner (signals → plans)
 *   orchestrator/  — A2.2 Discovery Orchestrator (plans → jobs)
 */

// Re-export everything from submodules
export * from "./types";
export * from "./planner";
export * from "./orchestrator";
