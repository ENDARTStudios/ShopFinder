/**
 * ShopFinder — Notifications API (REC-005).
 *
 * GET /api/admin/notifications
 *
 * Returns the operator's recent notifications, derived from:
 *   1. Pipeline executions with status `failed` (from SyncExecutionLog, last 24h).
 *   2. Products with status `review` (curator flagged for manual inspection).
 *   3. Products with low average confidence (< 0.70).
 *
 * Auth: requires operator or admin role.
 */
import { NextResponse } from "next/server";
import { prisma } from "@workspace/database";
import { requirePermissions } from "@/lib/admin-auth";

interface Notification {
  id: string;
  type: "pipeline_failed" | "product_review" | "low_confidence" | "flagged_review";
  severity: "info" | "warning" | "error";
  message: string;
  timestamp: string;
  link?: string;
}

export async function GET() {
  // Authorization: notificações operacionais exigem catalog.read (docs/eng/RBAC.md)
  const guard = await requirePermissions("admin.access");
  if (!guard.ok) return guard.response;

  const notifications: Notification[] = [];

  // 1. Failed pipeline executions (last 24h)
  const failedRuns = await prisma.syncExecutionLog.findMany({
    where: {
      status: "failed",
      startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    orderBy: { startedAt: "desc" },
    take: 5
  });
  for (const run of failedRuns) {
    notifications.push({
      id: `pipeline-failed-${run.id}`,
      type: "pipeline_failed",
      severity: "error",
      message: `Pipeline execution failed: ${run.errorMessage ?? "Unknown error"}`,
      timestamp: run.startedAt.toISOString(),
      link: "/admin/pipeline"
    });
  }

  // 2. Products in review status
  const reviewProducts = await prisma.product.findMany({
    where: { status: "review", deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      slug: true,
      title: true,
      updatedAt: true,
      attributes: { select: { confidence: true } }
    }
  });
  for (const p of reviewProducts) {
    const attrsWithConfidence = p.attributes.filter((a) => a.confidence !== null);
    const avgConfidence =
      attrsWithConfidence.length > 0
        ? attrsWithConfidence.reduce((s, a) => s + (a.confidence ?? 0), 0) /
          attrsWithConfidence.length
        : 0;
    notifications.push({
      id: `product-review-${p.id}`,
      type: "product_review",
      severity: "warning",
      message: `Product awaiting review: ${p.title} (avg confidence: ${(avgConfidence * 100).toFixed(0)}%)`,
      timestamp: p.updatedAt.toISOString(),
      link: `/produtos/${p.slug}`
    });
  }

  // 2b. Reviews sinalizadas aguardando moderação humana (T082/D1-NOVA_DIRECAO)
  const flaggedReviews = await prisma.review.findMany({
    where: { status: "flagged" },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      updatedAt: true,
      product: { select: { slug: true, title: true } }
    }
  });
  for (const r of flaggedReviews) {
    notifications.push({
      id: `flagged-review-${r.id}`,
      type: "flagged_review",
      severity: "warning",
      message: `Review sinalizada aguardando moderação: ${r.product.title}`,
      timestamp: r.updatedAt.toISOString(),
      link: "/admin/reviews"
    });
  }

  // 3. Low-confidence published products (confidence < 0.70)
  const lowConfidenceProducts = await prisma.product.findMany({
    where: {
      status: "published",
      deletedAt: null,
      attributes: { some: { confidence: { lt: 0.7, not: null } } }
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      slug: true,
      title: true,
      updatedAt: true,
      attributes: { select: { confidence: true } }
    }
  });
  for (const p of lowConfidenceProducts) {
    const attrsWithConfidence = p.attributes.filter((a) => a.confidence !== null);
    const avgConfidence =
      attrsWithConfidence.length > 0
        ? attrsWithConfidence.reduce((s, a) => s + (a.confidence ?? 0), 0) /
          attrsWithConfidence.length
        : 0;
    notifications.push({
      id: `product-low-confidence-${p.id}`,
      type: "low_confidence",
      severity: "warning",
      message: `Low confidence: ${p.title} (avg ${(avgConfidence * 100).toFixed(0)}%)`,
      timestamp: p.updatedAt.toISOString(),
      link: `/produtos/${p.slug}`
    });
  }

  // Sort by timestamp descending, cap at 20
  notifications.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const top = notifications.slice(0, 20);

  return NextResponse.json({
    notifications: top,
    total: notifications.length,
    counts: {
      error: top.filter((n) => n.severity === "error").length,
      warning: top.filter((n) => n.severity === "warning").length,
      info: top.filter((n) => n.severity === "info").length
    }
  });
}
