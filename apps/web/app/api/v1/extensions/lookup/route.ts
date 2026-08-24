export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchStoreListingName, parseItemId } from "@/lib/chrome-store";

/**
 * GET /api/v1/extensions/lookup?q=... — turn a pasted store URL into a name.
 *
 * The Chrome Web Store API cannot list a publisher's items (its whole surface
 * is five per-item methods), so the id has to be supplied. This makes supplying
 * it a paste rather than a transcription, and fills the name in from the public
 * listing so there is nothing left to type.
 *
 * Session-gated despite reading a public page: an open endpoint that fetches a
 * URL on request is a request forwarder, and this one is only ever useful to
 * someone already signed in.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const itemId = parseItemId(query);

  if (!itemId) {
    return NextResponse.json(
      { success: false, error: "No Chrome Web Store id in that" },
      { status: 400 }
    );
  }

  // A null name is not a failure: an extension that has never been published
  // has no public page, and that is exactly the case worth watching.
  const name = await fetchStoreListingName(itemId);

  return NextResponse.json({ success: true, data: { itemId, name } });
}
