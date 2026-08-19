/**
 * ShopFinder — Pipeline status dashboard (REC-005).
 *
 * Client component with auto-refresh (30s polling). Shows:
 *   - Connector cards with mode badges (LIVE/REPLAY/NOT CONFIGURED)
 *   - Run statistics (total, success rate, avg duration, last run)
 *   - Execution timeline (last 20 runs with status, duration, items)
 *   - Stage timings table (aggregated across runs)
 */
"use client";

import * as React from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Database,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  TrendingUp
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineStatusSkeleton } from "@/components/site/admin-skeletons";

interface ConnectorStatus {
  code: string;
  name: string;
  mode: string;
  credentialsConfigured: boolean;
  envVars: string[];
  forceReplayFlag: boolean;
  sandbox: boolean;
}

interface ExecutionRow {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errorMessage: string | null;
  ebayMode: string | null;
  stageMetrics: Record<string, number> | null;
}

interface StageMetric {
  name: string;
  totalMs: number;
  count: number;
  avgMs: number;
}

interface PipelineStatus {
  connectors: ConnectorStatus[];
  executions: ExecutionRow[];
  stageMetrics: StageMetric[];
  stats: {
    totalExecutions: number;
    successfulRuns: number;
    failedRuns: number;
    lastRunAt: string | null;
    avgDurationMs: number;
    successRate: number;
  };
}

function usePipelineStatus(autoRefreshMs = 30_000) {
  const [data, setData] = React.useState<PipelineStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchOnce = React.useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/admin/pipeline/status");
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized — sign in again");
        if (res.status === 403) throw new Error("Forbidden — operator role required");
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as PipelineStatus;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOnce();
    const id = setInterval(() => fetchOnce(true), autoRefreshMs);
    return () => clearInterval(id);
  }, [fetchOnce, autoRefreshMs]);

  return { data, loading, error, refreshing, refresh: () => fetchOnce(true) };
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return `${min}m ${sec}s`;
}

function modeBadgeClass(mode: string): string {
  if (mode === "live") return "bg-emerald-500/90 text-white";
  if (mode === "replay") return "bg-amber-500/90 text-white";
  return "bg-slate-500/90 text-white";
}

function modeLabel(mode: string): string {
  return mode === "not_configured" ? "NOT CONFIGURED" : mode.toUpperCase();
}

export default function PipelineStatusPage() {
  const { data, loading, error, refreshing, refresh } = usePipelineStatus();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Activity className="h-6 w-6 text-emerald-500" />
              Pipeline Status
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <PipelineStatusSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="mr-1.5 inline h-4 w-4" />
            {error}
          </div>
        ) : !data ? null : (
          <>
            {/* Connectors */}
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Connectors
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.connectors.map((c) => (
                  <Card key={c.code}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Database className="h-4 w-4 text-emerald-500" />
                          {c.name}
                        </CardTitle>
                        <Badge className={modeBadgeClass(c.mode)}>{modeLabel(c.mode)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Credentials</span>
                        <span
                          className={
                            c.credentialsConfigured
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          {c.credentialsConfigured ? "Configured" : "Missing (sandbox mode)"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Environment</span>
                        <span>{c.sandbox ? "Sandbox" : "Production"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Force replay</span>
                        <span>{c.forceReplayFlag ? "Yes" : "No"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Required env vars:</span>
                        <div className="flex flex-wrap gap-1">
                          {c.envVars.map((v) => (
                            <code
                              key={v}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono"
                            >
                              {v}
                            </code>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Stats */}
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Run Statistics
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Total runs
                        </span>
                        <span className="block text-lg font-bold">
                          {data.stats.totalExecutions}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Success rate
                        </span>
                        <span className="block text-lg font-bold">
                          {(data.stats.successRate * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Avg duration
                        </span>
                        <span className="block text-lg font-bold">
                          {formatDuration(data.stats.avgDurationMs)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Last run
                        </span>
                        <span className="block text-lg font-bold">
                          {formatRelativeTime(data.stats.lastRunAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Timeline */}
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Execution Timeline
              </h2>
              {data.executions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                  No pipeline runs yet. Run{" "}
                  <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    bun run scripts/run-pipeline.ts
                  </code>{" "}
                  to populate this list.
                </div>
              ) : (
                <div className="space-y-2">
                  {data.executions.map((row) => (
                    <div key={row.id} className="rounded-lg border border-border/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          {row.status === "succeeded" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${row.status === "succeeded" ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "text-red-600 dark:text-red-400 border-red-500/30"}`}
                              >
                                {row.status}
                              </Badge>
                              {row.ebayMode && (
                                <Badge variant="outline" className="text-[10px]">
                                  eBay: {row.ebayMode}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              <Calendar className="mr-1 inline h-3 w-3" />
                              {new Date(row.startedAt).toLocaleString()} ·{" "}
                              {formatRelativeTime(row.startedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-medium">{formatDuration(row.durationMs)}</div>
                          <div className="text-muted-foreground">
                            {row.itemsSucceeded}/{row.itemsProcessed} ok
                            {row.itemsFailed > 0 && (
                              <span className="ml-1 text-red-500">· {row.itemsFailed} fail</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {row.errorMessage && (
                        <div className="mt-2 rounded-md bg-red-500/5 px-2 py-1 text-[11px] text-red-600 dark:text-red-400">
                          {row.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Stage timings */}
            {data.stageMetrics && data.stageMetrics.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  Stage Timings (aggregated)
                </h2>
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20">
                          <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Stage
                          </th>
                          <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Total ms
                          </th>
                          <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Avg ms
                          </th>
                          <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Runs
                          </th>
                          <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Share
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const totalMs = data.stageMetrics.reduce((s, m) => s + m.totalMs, 0) || 1;
                          return data.stageMetrics.map((m, i) => (
                            <tr
                              key={m.name}
                              className={
                                i % 2 === 0
                                  ? "border-b border-border/40 bg-muted/5"
                                  : "border-b border-border/40"
                              }
                            >
                              <td className="p-3 font-mono text-xs">{m.name}</td>
                              <td className="p-3 text-right text-xs font-medium">
                                {m.totalMs.toLocaleString()}
                              </td>
                              <td className="p-3 text-right text-xs">{m.avgMs.toLocaleString()}</td>
                              <td className="p-3 text-right text-xs">{m.count}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-emerald-500"
                                      style={{ width: `${(m.totalMs / totalMs) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {((m.totalMs / totalMs) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
