/**
 * @workspace/observability/logger
 *
 * Structured logger interface. The default implementation is a thin wrapper
 * around console that emits JSON to stdout. In production, swap with
 * pino / Datadog / Sentry by registering a different adapter.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, context?: LogContext, error?: Error): void;
  fatal(msg: string, context?: LogContext, error?: Error): void;
  child(context: LogContext): Logger;
}

// ── Default implementation ──────────────────────────────────

class ConsoleLogger implements Logger {
  constructor(
    private readonly context: LogContext = {},
    private readonly minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "info"
  ) {}

  private readonly levels: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private emit(level: LogLevel, msg: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;
    const payload = {
      level,
      msg,
      ts: new Date().toISOString(),
      ...this.context,
      ...context,
      ...(error ? { error: { name: error.name, message: error.message, stack: error.stack } } : {})
    };
    const stream = level === "error" || level === "fatal" ? process.stderr : process.stdout;
    stream.write(JSON.stringify(payload) + "\n");
  }

  debug(msg: string, context?: LogContext) {
    this.emit("debug", msg, context);
  }
  info(msg: string, context?: LogContext) {
    this.emit("info", msg, context);
  }
  warn(msg: string, context?: LogContext) {
    this.emit("warn", msg, context);
  }
  error(msg: string, context?: LogContext, error?: Error) {
    this.emit("error", msg, context, error);
  }
  fatal(msg: string, context?: LogContext, error?: Error) {
    this.emit("fatal", msg, context, error);
  }
  child(context: LogContext): Logger {
    return new ConsoleLogger({ ...this.context, ...context }, this.minLevel);
  }
}

// ── Singleton ───────────────────────────────────────────────

let _logger: Logger | null = null;

export function getLogger(): Logger {
  if (!_logger) _logger = new ConsoleLogger();
  return _logger;
}

export function setLogger(logger: Logger): void {
  _logger = logger;
}
