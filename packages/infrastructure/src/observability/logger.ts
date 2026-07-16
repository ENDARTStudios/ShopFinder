/**
 * @workspace/infrastructure/observability/logger
 *
 * Structured logger that always includes traceId, producer, artifactVersion,
 * and schemaVersion from ArtifactMetadata.
 *
 * Any log can be correlated immediately with a pipeline artifact.
 */
import type { DiscoveryTraceId } from "@workspace/domain/shared";
import type { ArtifactMetadata } from "@workspace/domain/discovery/traceability";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly traceId?: string;
  readonly producer?: string;
  readonly artifactVersion?: string;
  readonly schemaVersion?: string;
  readonly stage?: string;
  readonly data?: Record<string, unknown>;
  readonly error?: string;
}

export interface StructuredLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: unknown, data?: Record<string, unknown>): void;
  withMetadata(metadata: Partial<ArtifactMetadata>): StructuredLogger;
  withTraceId(traceId: DiscoveryTraceId): StructuredLogger;
  withStage(stage: string): StructuredLogger;
}

export class ObservabilityLogger implements StructuredLogger {
  private traceId?: string;
  private producer?: string;
  private artifactVersion?: string;
  private schemaVersion?: string;
  private stage?: string;

  constructor(
    private readonly minLevel: LogLevel = "info",
    private readonly sink: (entry: LogEntry) => void = consoleLogger
  ) {}

  debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("info")) this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) this.log("warn", message, data);
  }

  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      this.log("error", message, {
        ...data,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  withMetadata(metadata: Partial<ArtifactMetadata>): StructuredLogger {
    const child = this.clone();
    if (metadata.traceId) child.traceId = metadata.traceId as string;
    if (metadata.producer) child.producer = metadata.producer;
    if (metadata.artifactVersion) child.artifactVersion = metadata.artifactVersion;
    if (metadata.schemaVersion) child.schemaVersion = metadata.schemaVersion;
    return child;
  }

  withTraceId(traceId: DiscoveryTraceId): StructuredLogger {
    const child = this.clone();
    child.traceId = traceId as string;
    return child;
  }

  withStage(stage: string): StructuredLogger {
    const child = this.clone();
    child.stage = stage;
    return child;
  }

  private clone(): ObservabilityLogger {
    const child = new ObservabilityLogger(this.minLevel, this.sink);
    child.traceId = this.traceId;
    child.producer = this.producer;
    child.artifactVersion = this.artifactVersion;
    child.schemaVersion = this.schemaVersion;
    child.stage = this.stage;
    return child;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.minLevel];
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    this.sink({
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId: this.traceId,
      producer: this.producer,
      artifactVersion: this.artifactVersion,
      schemaVersion: this.schemaVersion,
      stage: this.stage,
      data,
    });
  }
}

// ── Default sink: console (structured JSON) ────────────────

function consoleLogger(entry: LogEntry): void {
  const output = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
    }
}

// ── Factory ────────────────────────────────────────────────

export function createLogger(minLevel?: LogLevel, sink?: (entry: LogEntry) => void): StructuredLogger {
  return new ObservabilityLogger(minLevel, sink);
}

/**
 * Create a logger that captures entries in-memory (for tests).
 */
export function createTestLogger(): { logger: StructuredLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const logger = new ObservabilityLogger("debug", (entry) => entries.push(entry));
  return { logger, entries };
}
