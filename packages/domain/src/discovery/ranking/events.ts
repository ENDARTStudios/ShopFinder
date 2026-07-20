/**
 * @workspace/domain/discovery/ranking/events
 */
import type { DomainEvent } from "../../shared";

export const RANKING_EVENT_TYPES = [
  "discovery.ranking.batch_completed",
  "discovery.ranking.record_created"
] as const;

export type RankingEventType = (typeof RANKING_EVENT_TYPES)[number];

export interface RankingVersionedPayload {
  readonly schemaVersion: "1.0.0";
  readonly rankingVersion: string;
}

export interface RankingBatchCompletedPayload extends RankingVersionedPayload {
  readonly batchId: string;
  readonly productsRanked: number;
  readonly averageScore: number;
  readonly topScore: number;
}

export interface RankingRecordCreatedPayload extends RankingVersionedPayload {
  readonly recordId: string;
  readonly productId: string;
  readonly rankingPosition: number;
  readonly overallScore: number;
}

export type RankingEvent = RankingBatchCompletedEvent | RankingRecordCreatedEvent;

export interface RankingEventBase extends Omit<DomainEvent, "eventType"> {
  readonly eventType: RankingEventType;
}

export interface RankingBatchCompletedEvent extends RankingEventBase {
  readonly eventType: (typeof RANKING_EVENT_TYPES)[0];
  readonly aggregateType: "RankingBatch";
  readonly payload: RankingBatchCompletedPayload;
}
export interface RankingRecordCreatedEvent extends RankingEventBase {
  readonly eventType: (typeof RANKING_EVENT_TYPES)[1];
  readonly aggregateType: "RankingRecord";
  readonly payload: RankingRecordCreatedPayload;
}

let _seq = 0;
function nextEventId(): string {
  _seq += 1;
  return `rank_evt_${Date.now()}_${_seq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeRankingBatchCompletedEvent(
  versions: { rankingVersion: string },
  payload: Omit<RankingBatchCompletedPayload, keyof RankingVersionedPayload>
): RankingBatchCompletedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.ranking.batch_completed",
    aggregateType: "RankingBatch",
    aggregateId: payload.batchId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}

export function makeRankingRecordCreatedEvent(
  versions: { rankingVersion: string },
  payload: Omit<RankingRecordCreatedPayload, keyof RankingVersionedPayload>
): RankingRecordCreatedEvent {
  return {
    eventId: nextEventId(),
    eventType: "discovery.ranking.record_created",
    aggregateType: "RankingRecord",
    aggregateId: payload.recordId,
    occurredAt: new Date(),
    version: 1,
    payload: { ...payload, schemaVersion: "1.0.0", ...versions }
  };
}
