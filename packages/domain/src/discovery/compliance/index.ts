/**
 * @workspace/domain/discovery/compliance
 *
 * Barrel exports for Compliance PostCheck (A2.9).
 *
 * Compliance PreCheck (in evaluation/compliance-check.ts) runs BEFORE
 * inference to save AI cost on unviable products.
 * Compliance PostCheck (here) runs AFTER evaluation to validate the
 * result against score/documentation/certification/regional/commercial rules.
 *
 * Layout:
 *   types.ts         — CompliancePostCheckResult, ComplianceRule, ComplianceRepository
 *   rules.ts         — 8 default rules (score/documentation/certification/regional/commercial/safety)
 *   events.ts        — 4 events (PostCheckCompleted/Approved/Rejected/RequiresReview)
 *   repository.ts    — In-memory ComplianceRepository (append-only)
 *   coordinator.ts   — ComplianceCoordinator (run rules → categorize → emit)
 */

export * from "./types";
export * from "./rules";
export * from "./events";
export * from "./repository";
export * from "./coordinator";
