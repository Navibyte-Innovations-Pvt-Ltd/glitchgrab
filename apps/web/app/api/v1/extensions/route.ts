export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseItemId } from "@/lib/chrome-store";

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
      repoId: true,
      state: true,
      stateDetail: true,
      publishedVersion: true,
      submittedVersion: true,
      stateSince: true,
      lastCheckedAt: true,
      lastError: true,
      repo: { select: { fullName: true } },
      connection: { select: { googleEmail: true, lastError: true, publisherId: true } },
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
  const publisherId = body.publisherId?.trim();

  // Accepts a pasted store URL as readily as a bare id — see parseItemId. A
  // typo caught here is a message now instead of a silent 404 from Google
  // every 30 minutes forever.
  const itemId = parseItemId(body.itemId ?? "");

  if (!name || !itemId) {
    return NextResponse.json(
      { success: false, error: "A name and a Chrome Web Store link or id are required" },
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
    select: { id: true, publisherId: true },
    orderBy: { createdAt: "asc" },
  });

  if (connections.length === 0) {
    return NextResponse.json(
      { success: false, error: "Connect a Google account with Chrome Web Store access first" },
      { status: 400 }
    );
  }

  const connection = body.connectionId
    ? connections.find((c) => c.id === body.connectionId)
    : connections[0];

  if (!connection) {
    return NextResponse.json({ success: false, error: "Unknown connection" }, { status: 400 });
  }

  // The publisher is a property of the account, asked once. It only comes in
  // with the first extension, because that is the first moment anyone has a
  // reason to look it up.
  if (!connection.publisherId) {
    if (!publisherId) {
      return NextResponse.json(
        { success: false, error: "Publisher id is needed once for this account" },
        { status: 400 }
      );
    }
    await prisma.storeConnection.update({
      where: { id: connection.id },
      data: { publisherId },
    });
  } else if (publisherId && publisherId !== connection.publisherId) {
    // Correcting it is legitimate — a wrong one 404s every item on the account.
    await prisma.storeConnection.update({
      where: { id: connection.id },
      data: { publisherId },
    });
  }

  const saved = await prisma.storeExtension.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, name, itemId, repoId, connectionId: connection.id },
    update: {
      name,
      repoId,
      connectionId: connection.id,
      // A re-registration usually follows a fix, so a stale error must not sit
      // on screen until the next sweep half an hour later.
      lastError: null,
    },
    select: { id: true, name: true, itemId: true },
  });

  return NextResponse.json({ success: true, data: saved });
}
