/**
 * @workspace/application/pipeline — Middleware pipeline
 *
 * Per Rec 3 of 05 feedback: reusable pipeline for all application services.
 * Eliminates repetition across use cases.
 *
 * Flow:
 *   Request → Validation → Authorization → Idempotency → Logging → Metrics → Handler → Events → Response
 *
 * The CommandBus/QueryBus wrap each handler execution with this pipeline.
 * Middlewares are composable and order-independent (each decides to call next).
 */

import type { RequestContext, ApplicationError } from "../types";

export interface MiddlewareResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: ApplicationError;
}

export type NextFn<T> = () => Promise<MiddlewareResult<T>>;

export interface Middleware<TPayload, TResult> {
  readonly name: string;
  execute(
    payload: TPayload,
    context: RequestContext,
    next: NextFn<TResult>
  ): Promise<MiddlewareResult<TResult>>;
}

// ── Pipeline builder ────────────────────────────────────────

export class Pipeline<TPayload, TResult> {
  private readonly middlewares: Middleware<TPayload, TResult>[] = [];

  use(middleware: Middleware<TPayload, TResult>): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(
    payload: TPayload,
    context: RequestContext,
    handler: () => Promise<MiddlewareResult<TResult>>
  ): Promise<MiddlewareResult<TResult>> {
    // Build the chain: middleware[0] → middleware[1] → ... → handler
    let chain = handler;
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const mw = this.middlewares[i];
      const next = chain;
      chain = () => mw.execute(payload, context, next);
    }
    return chain();
  }
}

export function createPipeline<TPayload, TResult>(): Pipeline<TPayload, TResult> {
  return new Pipeline<TPayload, TResult>();
}
