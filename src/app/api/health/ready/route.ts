import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRedisHealth } from "@/lib/redis";

/**
 * Readiness — dependências críticas acessíveis (docs/eng/OBSERVABILITY.md).
 * 503 quando uma dependência falha (orchestrator deve tirar o pod do load balancer).
 */
export async function GET() {
  const checks: Record<string, string> = {};
  let ready = true;

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
    ready = false;
  }

  const redis = await checkRedisHealth();
  checks.redis = redis.status; // not_configured/degraded não bloqueiam o readiness

  return NextResponse.json(
    { status: ready ? "ready" : "not_ready", checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503 }
  );
}
