/**
 * @workspace/infrastructure/connectors/core/checkpoint
 *
 * CheckpointSerializer — serializes/deserializes pagination cursors
 * so workers can resume from the last checkpoint.
 */
import type { CheckpointSerializer } from "./types";

export class StringCheckpointSerializer implements CheckpointSerializer<string> {
  serialize(cursor: string): string {
    return cursor;
  }
  deserialize(data: string): string {
    return data;
  }
}

export class JsonCheckpointSerializer<T> implements CheckpointSerializer<T> {
  serialize(cursor: T): string {
    return JSON.stringify(cursor);
  }
  deserialize(data: string): T {
    return JSON.parse(data) as T;
  }
}

export function createStringCheckpointSerializer(): CheckpointSerializer<string> {
  return new StringCheckpointSerializer();
}

export function createJsonCheckpointSerializer<T>(): CheckpointSerializer<T> {
  return new JsonCheckpointSerializer<T>();
}
