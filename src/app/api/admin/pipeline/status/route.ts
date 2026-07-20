/**
 * ShopFinder — Pipeline Status API (REC-005).
 *
 * GET /api/admin/pipeline/status
 *
 * Returns connectors, last 20 SyncExecutionLog entries, and aggregate stats.
 * Auth: requires operator or admin role.
 */
import { NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { getServerAuthSession } from "@workspace/auth";

function hasAdminRole(roles: string[] | undefined): boolean {
  if (!roles) return false;
  return roles.includes("admin") || roles.includes("operator");
}

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { roles?: string[] };
  if (!hasAdminRole(user.roles)) {
    return NextResponse.json(
      { error: "Forbidden — requires admin or operator role" },
      { status: 403 }
    );
  }

  // Connector status — eBay via env vars, DigiKey/Amazon as not_configured placeholders
  const ebayAppId = process.env.EBAY_APP_ID ?? process.env.EBAY_CLIENT_ID;
  const ebayCertId = process.env.EBAY_CERT_ID ?? process.env.EBAY_CLIENT_SECRET;
  const ebayConfigured = !!(ebayAppId && ebayCertId);
  const ebayForceReplay = process.env.EBAY_FORCE_REPLAY === "true";
  const ebayMode = ebayConfigured && !ebayForceReplay ? "live" : "replay";

  const connectors = [
    {
      code: "ebay",
      name: "eBay Browse API",
      mode: ebayMode,
      credentialsConfigured: ebayConfigured,
      envVars: ["EBAY_APP_ID", "EBAY_CERT_ID"],
      forceReplayFlag: ebayForceReplay,
      sandbox: process.env.EBAY_SANDBOX !== "false"
    },
    {
      code: "digikey",
      name: "DigiKey Product API",
      mode: "not_configured",
      credentialsConfigured: false,
      envVars: ["DIGIKEY_CLIENT_ID", "DIGIKEY_CLIENT_SECRET"],
      forceReplayFlag: false,
      sandbox: true
    },
    {
      code: "amazon",
      name: "Amazon Product Advertising API",
      mode: "not_configured",
      credentialsConfigured: false,
      envVars: ["AMAZON_ACCESS_KEY", "AMAZON_SECRET_KEY", "AMAZON_PARTNER_TAG"],
      forceReplayFlag: false,
      sandbox: true
    }
  ];

  // Latest executions
  const logs = await prisma.syncExecutionLog.findMany({
    where: { syncJobId: "pipeline-runner-job" },
    orderBy: { startedAt: "desc" },
    take: 20
  });

  const executions = logs.map((l) => {
    const meta = (l.metadata ?? {}) as { ebayMode?: string; stageMetrics?: Record<string, number> };
    return {
      id: l.id,
      status: l.status,
      trigger: l.trigger,
      startedAt: l.startedAt.toISOString(),
      finishedAt: l.finishedAt?.toISOString() ?? null,
      durationMs: l.durationMs,
      itemsProcessed: l.itemsProcessed,
      itemsSucceeded: l.itemsSucceeded,
      itemsFailed: l.itemsFailed,
      errorMessage: l.errorMessage,
      ebayMode: meta.ebayMode ?? null,
      stageMetrics: meta.stageMetrics ?? null
    };
  });

  // Aggregate stats
  const totalExecutions = executions.length;
  const successfulRuns = executions.filter((r) => r.status === "succeeded").length;
  const failedRuns = executions.filter((r) => r.status === "failed").length;
  const lastRunAt = executions[0]?.startedAt ?? null;
  const avgDurationMs =
    totalExecutions > 0
      ? Math.round(
          executions
            .filter((r) => r.durationMs !== null)
            .reduce((sum, r) => sum + (r.durationMs ?? 0), 0) /
            Math.max(1, executions.filter((r) => r.durationMs !== null).length)
        )
      : 0;

  // Aggregate stage metrics across executions
  const aggregatedStages: Array<{ name: string; totalMs: number; count: number; avgMs: number }> = (() => {
    const acc = new Map<string, { totalMs: number; count: number }>();
    for (const row of executions) {
      if (!row.stageMetrics) continue;
      for (const [name, ms] of Object.entries(row.stageMetrics)) {
        const cur = acc.get(name) ?? { totalMs: 0, count: 0 };
        cur.totalMs += ms;
        cur.count += 1;
        acc.set(name, cur);
      }
    }
    return Array.from(acc.entries())
      .map(([name, m]) => ({
        name,
        totalMs: m.totalMs,
        count: m.count,
        avgMs: m.count > 0 ? Math.round(m.totalMs / m.count) : 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  return NextResponse.json({
    connectors,
    executions,
    stageMetrics: aggregatedStages,
    stats: {
      totalExecutions,
      successfulRuns,
      failedRuns,
      lastRunAt,
      avgDurationMs,
      successRate: totalExecutions > 0 ? successfulRuns / totalExecutions : 0
    }
  });
}
