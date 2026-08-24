export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { parseServiceAccount } from "@/lib/chrome-store";

/**
 * Chrome Web Store extensions this user ships (#332).
 *
 * GET  — everything being watched, with the last thing the store said.
 * POST — register one, or replace the credentials on an existing one.
 *
 * The service-account JSON is write-only through this API: it is encrypted on
 * arrival and never selected back out. A key that can publish an extension to
 * every existing user is closer to a signing key than to a setting.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const extensions = await prisma.storeExtension.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      itemId: true,
      publisherId: true,
      repoId: true,
      state: true,
      stateDetail: true,
      publishedVersion: true,
      submittedVersion: true,
      stateSince: true,
      lastCheckedAt: true,
      lastError: true,
      repo: { select: { fullName: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: extensions.map((e) => ({
      ...e,
      repoFullName: e.repo?.fullName ?? null,
      repo: undefined,
      stateSince: e.stateSince?.toISOString() ?? null,
      lastCheckedAt: e.lastCheckedAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    itemId?: string;
    publisherId?: string;
    credentials?: string;
    repoId?: string | null;
  };

  const name = body.name?.trim();
  const itemId = body.itemId?.trim();
  const publisherId = body.publisherId?.trim();

  if (!name || !itemId || !publisherId) {
    return NextResponse.json(
      { success: false, error: "Name, extension id and publisher id are required" },
      { status: 400 }
    );
  }

  // Store item ids are a fixed 32 lowercase letters. Checking here turns a
  // typo into a message now instead of a silent 404 from Google every 30
  // minutes forever.
  if (!/^[a-p]{32}$/.test(itemId)) {
    return NextResponse.json(
      { success: false, error: "That doesn't look like a Chrome Web Store extension id" },
      { status: 400 }
    );
  }

  // A repo is optional, but if one is named it has to be theirs.
  let repoId: string | null = null;
  if (body.repoId) {
    const repo = await prisma.repo.findFirst({
      where: { id: body.repoId, userId },
      select: { id: true },
    });
    if (!repo) {
      return NextResponse.json({ success: false, error: "Unknown project" }, { status: 400 });
    }
    repoId = repo.id;
  }

  const existing = await prisma.storeExtension.findUnique({
    where: { userId_itemId: { userId, itemId } },
    select: { id: true },
  });

  let credentials: string | undefined;
  if (body.credentials?.trim()) {
    try {
      // Parse before storing: an unusable key discovered at registration is a
      // form error, discovered by the cron it is a silent dead watcher.
      parseServiceAccount(body.credentials);
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : "That service account JSON is not valid",
        },
        { status: 400 }
      );
    }
    credentials = encrypt(body.credentials.trim());
  } else if (!existing) {
    return NextResponse.json(
      { success: false, error: "Service account JSON is required" },
      { status: 400 }
    );
  }

  const saved = await prisma.storeExtension.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: {
      userId,
      name,
      itemId,
      publisherId,
      repoId,
      credentials: credentials as string,
    },
    update: {
      name,
      publisherId,
      repoId,
      ...(credentials ? { credentials } : {}),
      // New credentials or a new publisher mean the last reading may be wrong.
      // Clear the error rather than leaving a stale one on screen until the
      // next sweep.
      lastError: null,
    },
    select: { id: true, name: true, itemId: true },
  });

  return NextResponse.json({ success: true, data: saved });
}
