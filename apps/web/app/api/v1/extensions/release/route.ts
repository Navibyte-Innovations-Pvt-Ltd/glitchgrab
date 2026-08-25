export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import {
  accessTokenForConnection,
  fetchItemStatus,
  nextVersion,
  uploadAndPublish,
} from "@/lib/chrome-store";

/**
 * Release an extension to the Chrome Web Store from CI (#332).
 *
 * The point of this endpoint is that **no repo holds Chrome Web Store
 * credentials**. A release workflow carries one `gg_` token — the same kind
 * already issued per repo — and Glitchgrab does the talking with the Google
 * account connected once in the dashboard. That removes the four secrets, the
 * seven-day refresh-token expiry and the rotation cron that the old per-repo
 * setup needed.
 *
 * GET  ?itemId=…  — what version is live, and what the next one should be.
 * POST            — the built zip; uploads and submits it for review.
 */

/** Conventional-commit bumps, so a workflow can pass what it worked out from the log. */
const BUMPS = new Set(["major", "minor", "patch"]);

/** A zip larger than this is not an extension; the store's own cap is lower still. */
const MAX_ZIP_BYTES = 50 * 1024 * 1024;

interface Resolved {
  extension: { id: string; itemId: string; name: string; connectionId: string };
  publisherId: string;
}

/**
 * Find the watched extension this token is allowed to release.
 *
 * Scoped through the token's repo, never through an id in the request: a token
 * that could name any extension would let one project publish another's.
 */
async function resolve(
  request: Request,
  itemId: string | null
): Promise<{ ok: Resolved } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer gg_")) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid or missing API token" },
        { status: 401 }
      ),
    };
  }

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(authHeader.replace("Bearer ", "")) },
    select: { repoId: true },
  });

  if (!apiToken) {
    return {
      error: NextResponse.json({ success: false, error: "Invalid API token" }, { status: 401 }),
    };
  }

  const extension = await prisma.storeExtension.findFirst({
    where: { repoId: apiToken.repoId, ...(itemId ? { itemId } : {}) },
    select: { id: true, itemId: true, name: true, connectionId: true },
  });

  if (!extension) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error:
            "No watched extension is filed under this token's project — add it on the Extensions page first",
        },
        { status: 404 }
      ),
    };
  }

  const connection = await prisma.storeConnection.findUnique({
    where: { id: extension.connectionId },
    select: { publisherId: true },
  });

  if (!connection?.publisherId) {
    return {
      error: NextResponse.json(
        { success: false, error: "That extension's Google account has no publisher id set" },
        { status: 400 }
      ),
    };
  }

  return { ok: { extension, publisherId: connection.publisherId } };
}

/**
 * GET /api/v1/extensions/release?itemId=…&bump=patch
 *
 * The workflow asks this before building so it can write the version into
 * `package.json` and `manifest.json`. The answer comes from the **store**, which
 * is the only copy that cannot drift: deriving it from a git tag and patching
 * files at build time leaves the repo saying one thing and the store another.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const resolved = await resolve(request, url.searchParams.get("itemId"));
  if ("error" in resolved) return resolved.error;

  const { extension, publisherId } = resolved.ok;
  const bumpParam = url.searchParams.get("bump") ?? "patch";
  const bump = (BUMPS.has(bumpParam) ? bumpParam : "patch") as "major" | "minor" | "patch";

  const accessToken = await accessTokenForConnection(extension.connectionId);
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: "The connected Google account needs reconnecting" },
      { status: 400 }
    );
  }

  try {
    const status = await fetchItemStatus({ publisherId, itemId: extension.itemId, accessToken });
    // The highest version the store knows about — a submitted-but-unreviewed
    // version still occupies its number, so ignoring it would produce a
    // duplicate the store refuses.
    const live = status.submittedVersion ?? status.publishedVersion;

    return NextResponse.json({
      success: true,
      data: {
        itemId: extension.itemId,
        name: extension.name,
        publishedVersion: status.publishedVersion,
        submittedVersion: status.submittedVersion,
        version: nextVersion(live, bump),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Could not reach the store" },
      { status: 502 }
    );
  }
}

/**
 * POST /api/v1/extensions/release
 *
 * Body: the zip itself (`application/zip`), with `?itemId=` naming which
 * extension. Uploads it and submits it for review in one step — an upload that
 * is never submitted is the Draft trap this product exists to catch, so the two
 * are not offered separately.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const resolved = await resolve(request, url.searchParams.get("itemId"));
  if ("error" in resolved) return resolved.error;

  const { extension, publisherId } = resolved.ok;

  const zip = await request.arrayBuffer();
  if (zip.byteLength === 0) {
    return NextResponse.json({ success: false, error: "No package was uploaded" }, { status: 400 });
  }
  if (zip.byteLength > MAX_ZIP_BYTES) {
    return NextResponse.json(
      { success: false, error: "That package is too large for the Chrome Web Store" },
      { status: 413 }
    );
  }

  const accessToken = await accessTokenForConnection(extension.connectionId);
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: "The connected Google account needs reconnecting" },
      { status: 400 }
    );
  }

  const result = await uploadAndPublish({
    publisherId,
    itemId: extension.itemId,
    accessToken,
    zip,
  });

  if (!result.ok) {
    await prisma.storeExtension.update({
      where: { id: extension.id },
      data: { lastError: result.error?.slice(0, 500) ?? "Release failed" },
    });
    return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  }

  // Record it as in review immediately. The cron would find this within half an
  // hour anyway, but a dashboard that still says "live v1.2.0" right after a
  // release invites someone to release again.
  await prisma.storeExtension.update({
    where: { id: extension.id },
    data: {
      state: "IN_REVIEW",
      stateDetail: null,
      stateSince: new Date(),
      lastCheckedAt: new Date(),
      lastError: null,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      itemId: extension.itemId,
      name: extension.name,
      state: "IN_REVIEW",
      // Said plainly because the workflow log is where someone looks first, and
      // the answer genuinely is not known yet.
      message: "Submitted for review — the verdict arrives on WhatsApp, not here",
    },
  });
}
