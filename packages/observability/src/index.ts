/**
 * @workspace/observability
 *
 * Single entry point for logger / metrics / tracing / instrumentation.
 * Importing from the root gives you the logger; subpaths give you the
 * specific subsystem.
 *
 *   import { getLogger } from "@workspace/observability";
 *   import { type MetricRecorder } from "@workspace/observability/metrics";
 */

export { getLogger, setLogger, type Logger, type LogContext, type LogLevel } from "./logger";
