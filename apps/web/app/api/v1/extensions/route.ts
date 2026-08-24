export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Chrome Web Store extensions this user ships (#332).
 *
 * GET  — everything being watched, with the last thing the store said.
 * POST — register one, or replace the credentials on an existing one.
 *
 * There is no credential here any more: an extension is attached to a
 * connected Google account (see POST /extensions/connect), and one connection
 * covers every extension on that publisher. The second extension is two ids.
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
      connection: { select: { googleEmail: true, lastError: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: extensions.map((e) => ({
      ...e,
      repoFullName: e.repo?.fullName ?? null,
      connectedAs: e.connection.googleEmail,
      // A dead connection is the extension's problem too — it is why the row
      // stopped updating.
      lastError: e.lastError ?? e.connection.lastError,
      repo: undefined,
      connection: undefined,
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
    connectionId?: string;
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

  // Which connected account reads this one. Defaulting to the only connection
  // is not a shortcut: with one account connected there is nothing to choose,
  // and asking would be a form field with a single option.
  const connections = await prisma.storeConnection.findMany({
    where: { userId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (connections.length === 0) {
    return NextResponse.json(
      { success: false, error: "Connect a Google account with Chrome Web Store access first" },
      { status: 400 }
    );
  }

  const connectionId = body.connectionId
    ? connections.find((c) => c.id === body.connectionId)?.id
    : connections[0]?.id;

  if (!connectionId) {
    return NextResponse.json({ success: false, error: "Unknown connection" }, { status: 400 });
  }

  const saved = await prisma.storeExtension.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, name, itemId, publisherId, repoId, connectionId },
    update: {
      name,
      publisherId,
      repoId,
      connectionId,
      // A re-registration usually follows a fix, so a stale error must not sit
      // on screen until the next sweep half an hour later.
      lastError: null,
    },
    select: { id: true, name: true, itemId: true },
  });

  return NextResponse.json({ success: true, data: saved });
}
