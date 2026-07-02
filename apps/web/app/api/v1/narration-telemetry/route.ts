export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Narration telemetry analytics + raw export. ADMIN-ONLY (rows aggregate every
// user's captured events incl. PII; see ADMIN_EMAILS gate in GET). Query params:
//   ?format=raw     → full rows (default: summary + recent rows, no full events)
//   ?limit=100      → cap rows (default 100, raw default 500)
//   ?appName=Stripe → filter to one product
//   ?minRefine=1    → only scripts that needed ≥N refinements
function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 1000) / 10 : 0;
}
function avg(nums: number[]): number {
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : 0;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: CORS });
  }
  // Cross-user analytics export (raw rows carry other users' captured events +
  // PII). Not owner-scoped — there's no userId column on NarrationTelemetry — so
  // it MUST be admin-only. Configure admins via ADMIN_EMAILS env (fail closed).
  if (!isAdminEmail(session.user.email)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403, headers: CORS });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const appName = url.searchParams.get("appName") || undefined;
  const minRefine = Number(url.searchParams.get("minRefine") || 0);
  const limit = Math.min(Number(url.searchParams.get("limit") || (format === "raw" ? 500 : 100)), 1000);

  const where = {
    ...(appName ? { appName } : {}),
    ...(minRefine > 0 ? { refineCount: { gte: minRefine } } : {}),
  };

  if (format === "raw") {
    // Full rows incl. events + refinement history — the training export.
    const rows = await prisma.narrationTelemetry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json({ success: true, data: { count: rows.length, rows } }, { headers: CORS });
  }

  // Summary view: aggregate quality signals + recent rows (events omitted).
  const rows = await prisma.narrationTelemetry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, sessionId: true, appName: true, lang: true, durationSec: true,
      eventCount: true, hasNotes: true, noteCount: true, model: true,
      genLatencyMs: true, initialChars: true, wasEmpty: true, wasRoman: true,
      devanagariRetried: true, devanagariRatio: true, refineCount: true,
      finalChars: true, createdAt: true,
    },
  });

  const total = rows.length;
  const withNotes = rows.filter((r) => r.hasNotes);
  const withoutNotes = rows.filter((r) => !r.hasNotes);

  // Per-app breakdown: avg refinement + empty rate per product.
  const byApp: Record<string, { count: number; avgRefine: number; emptyPct: number; avgChars: number }> = {};
  const apps = [...new Set(rows.map((r) => r.appName).filter(Boolean) as string[])];
  for (const a of apps) {
    const g = rows.filter((r) => r.appName === a);
    byApp[a] = {
      count: g.length,
      avgRefine: avg(g.map((r) => r.refineCount)),
      emptyPct: pct(g.filter((r) => r.wasEmpty).length, g.length),
      avgChars: avg(g.map((r) => r.finalChars)),
    };
  }

  const summary = {
    total,
    // Quality signals — the "how much refinement do scripts need" picture.
    avgRefineCount: avg(rows.map((r) => r.refineCount)),
    refinedAtLeastOncePct: pct(rows.filter((r) => r.refineCount > 0).length, total),
    emptyPct: pct(rows.filter((r) => r.wasEmpty).length, total),
    romanPct: pct(rows.filter((r) => r.wasRoman).length, total),
    devanagariRetriedPct: pct(rows.filter((r) => r.devanagariRetried).length, total),
    avgInitialChars: avg(rows.map((r) => r.initialChars)),
    avgFinalChars: avg(rows.map((r) => r.finalChars)),
    avgGenLatencyMs: avg(rows.map((r) => r.genLatencyMs)),
    // Notes vs no-notes — does explicit guidance reduce refinement?
    withNotes: { count: withNotes.length, avgRefine: avg(withNotes.map((r) => r.refineCount)), avgChars: avg(withNotes.map((r) => r.finalChars)) },
    withoutNotes: { count: withoutNotes.length, avgRefine: avg(withoutNotes.map((r) => r.refineCount)), avgChars: avg(withoutNotes.map((r) => r.finalChars)) },
    byApp,
  };

  return NextResponse.json({ success: true, data: { summary, rows } }, { headers: CORS });
}
