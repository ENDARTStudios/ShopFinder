import { NextResponse } from "next/server";

/**
 * Liveness — processo respondendo (docs/eng/OBSERVABILITY.md).
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
}
