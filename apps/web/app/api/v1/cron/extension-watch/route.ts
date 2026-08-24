export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { watchStoreExtensions } from "@/lib/extension-watch";

/**
 * GET /api/v1/cron/extension-watch
 *
 * The Chrome Web Store never tells anyone anything. A submission's verdict
 * lands hours or days after the release workflow exited, on a console nobody
 * has open — which is how an extension ends up sitting in Draft for a week
 * while the team believes it shipped.
 *
 * Every 30 minutes is plenty: review outcomes move on the scale of days, and
 * each run costs one token exchange plus one call per extension.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outcome = await watchStoreExtensions();
  return NextResponse.json({ success: true, data: outcome });
}
