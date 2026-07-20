/**
 * @workspace/domain/shared
 *
 * Base primitives + cross-cutting value objects + event bus + unit of work
 * + persistence conventions.
 * Every bounded context imports from here.
 */
export * from "./types";
export * from "./value-objects";
export * from "./event-bus";
export * from "./unit-of-work";
export * from "./persistence-conventions";
