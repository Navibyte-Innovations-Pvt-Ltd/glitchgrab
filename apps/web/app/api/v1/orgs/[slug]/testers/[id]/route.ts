export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureRepoWebhook } from "@/lib/github";
import { buildTesterUpdateData } from "./update-data";

/** Resolve org by slug and require the caller to be its OWNER. */
async function requireOwner(slug: string, userId: string) {
  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return { error: NextResponse.json({ success: false, error: "Org not found" }, { status: 404 }) };
  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId } },
  });
  if (!member || member.role !== "OWNER") {
    return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }
  return { org };
}

/**
 * PATCH /api/v1/orgs/[slug]/testers/[id] — edit a tester (OWNER only).
 * Body: { name?, phone?, email?, repoIds? }
 * When `repoIds` is present, the tester's repo assignment is fully replaced with
 * that set (add new, remove dropped). Omit `repoIds` to leave assignment untouched.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug, id } = await params;
  const { org, error } = await requireOwner(slug, session.user.id);
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    email?: string;
    repoIds?: string[];
  };
  const parsed = buildTesterUpdateData(body);
  if ("error" in parsed) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  const result = await prisma.tester.updateMany({
    where: { id, orgId: org.id },
    data: parsed.data,
  });
  if (result.count === 0) {
    return NextResponse.json({ success: false, error: "Tester not found" }, { status: 404 });
  }

  // Sync repo assignment when repoIds is provided (full replace).
  if (Array.isArray(body.repoIds)) {
    // Only accept repoIds that actually belong to this org.
    const validRepoIds = body.repoIds.length
      ? (
          await prisma.repo.findMany({
            where: { id: { in: body.repoIds }, orgId: org.id },
            select: { id: true },
          })
        ).map((r) => r.id)
      : [];

    const existing = await prisma.testerRepo.findMany({
      where: { testerId: id },
      select: { repoId: true },
    });
    const existingIds = new Set(existing.map((e) => e.repoId));
    const nextIds = new Set(validRepoIds);

    const toAdd = validRepoIds.filter((rid) => !existingIds.has(rid));
    const toRemove = [...existingIds].filter((rid) => !nextIds.has(rid));

    await prisma.$transaction([
      ...(toRemove.length
        ? [prisma.testerRepo.deleteMany({ where: { testerId: id, repoId: { in: toRemove } } })]
        : []),
      ...(toAdd.length
        ? [prisma.testerRepo.createMany({ data: toAdd.map((repoId) => ({ testerId: id, repoId })) })]
        : []),
    ]);

    // Ensure newly-assigned repos have their GitHub pull_request webhook subscribed —
    // without it a merged PR never reaches us and no QA check is ever created.
    if (toAdd.length) {
      const account = await prisma.account.findFirst({
        where: { userId: session.user.id, provider: "github" },
        select: { access_token: true },
      });
      if (account?.access_token) {
        const token = account.access_token;
        const addedRepos = await prisma.repo.findMany({
          where: { id: { in: toAdd } },
          select: { fullName: true },
        });
        await Promise.all(
          addedRepos.map((r) => {
            const [repoOwner, ...rest] = r.fullName.split("/");
            return ensureRepoWebhook(token, repoOwner, rest.join("/"));
          })
        );
      }
    }
  }

  return NextResponse.json({ success: true });
}

/** DELETE /api/v1/orgs/[slug]/testers/[id] — remove a tester (OWNER only). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug, id } = await params;

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!member || member.role !== "OWNER") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // Scope delete to this org so an owner can't delete another org's tester
  const result = await prisma.tester.deleteMany({ where: { id, orgId: org.id } });
  if (result.count === 0) {
    return NextResponse.json({ success: false, error: "Tester not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
