/**
 * @workspace/domain/discovery/ranking/coordinator
 *
 * RankingCoordinator — scores catalog entries and assigns ranking positions.
 * The catalog stays static; RankingRecord is a separate artifact.
 */
import type {
  RankingCoordinatorInput,
  RankingCoordinatorResult,
  RankingBatchId,
  RankingRecord,
  RankingRecordId,
  RankingMetrics,
  RankingPolicy,
  RankingRepository
} from "./types";
import {
  makeRankingBatchCompletedEvent,
  makeRankingRecordCreatedEvent,
  type RankingEvent
} from "./events";

export interface RankingEventPublisher {
  publish(events: ReadonlyArray<RankingEvent>): Promise<void>;
}

export interface RankingCoordinatorDeps {
  readonly repository: RankingRepository;
  readonly policy: RankingPolicy;
  readonly events?: RankingEventPublisher;
}

export class RankingCoordinator {
  constructor(private readonly deps: RankingCoordinatorDeps) {}

  async rank(input: RankingCoordinatorInput): Promise<RankingCoordinatorResult> {
    const start = Date.now();
    const batchId = input.batchId as unknown as RankingBatchId;

    // 1. Score all entries
    const scored = input.catalogEntries.map((entry) => {
      const { score, factors } = this.deps.policy.score(entry);
      return { entry, score, factors };
    });

    // 2. Sort by overall score descending
    scored.sort((a, b) => b.score.overall - a.score.overall);

    // 3. Assign ranking positions
    const records: RankingRecord[] = scored.map((s, i) => ({
      id: `rank_${batchId}_${s.entry.id}` as unknown as RankingRecordId,
      productId: s.entry.id,
      score: s.score,
      rankingPosition: i + 1,
      rankingVersion: this.deps.policy.version,
      factors: s.factors,
      generatedAt: new Date(),
      batchId,
      schemaVersion: "1.0.0"
    }));

    // 4. Persist
    await this.deps.repository.appendBatch(records);

    // 5. Emit events
    if (this.deps.events) {
      const events: RankingEvent[] = records.map((r) =>
        makeRankingRecordCreatedEvent(
          { rankingVersion: this.deps.policy.version },
          {
            recordId: r.id,
            productId: r.productId,
            rankingPosition: r.rankingPosition,
            overallScore: r.score.overall
          }
        )
      );

      const totalScore = records.reduce((s, r) => s + r.score.overall, 0);
      events.push(
        makeRankingBatchCompletedEvent(
          { rankingVersion: this.deps.policy.version },
          {
            batchId: input.batchId,
            productsRanked: records.length,
            averageScore: records.length > 0 ? totalScore / records.length : 0,
            topScore: records.length > 0 ? records[0]!.score.overall : 0
          }
        )
      );

      await this.deps.events.publish(events);
    }

    const totalScore = records.reduce((s, r) => s + r.score.overall, 0);
    const metrics: RankingMetrics = {
      productsRanked: records.length,
      averageScore: records.length > 0 ? totalScore / records.length : 0,
      topScore: records.length > 0 ? records[0]!.score.overall : 0,
      durationMs: Date.now() - start
    };

    return { batchId, records, metrics, durationMs: Date.now() - start };
  }
}

export function createRankingCoordinator(deps: RankingCoordinatorDeps): RankingCoordinator {
  return new RankingCoordinator(deps);
}
