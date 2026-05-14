export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET — list repos assigned to a member
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug, memberId } = await params;

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  const requester = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!requester) return NextResponse.json({ success: false, error: "Not a member" }, { status: 403 });

  const memberRepos = await prisma.orgMemberRepo.findMany({
    where: { orgMemberId: memberId },
    include: { repo: { select: { id: true, fullName: true, name: true } } },
  });

  return NextResponse.json({ success: true, data: memberRepos });
}

// PATCH — replace repo assignments for a member
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug, memberId } = await params;
  const { repoIds } = (await request.json()) as { repoIds: string[] };

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  // Only OWNER can assign repos
  const requester = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!requester || requester.role !== "OWNER") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // Verify target member belongs to this org
  const targetMember = await prisma.orgMember.findFirst({
    where: { id: memberId, orgId: org.id },
  });
  if (!targetMember) {
    return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
  }

  // Verify all repoIds belong to this org
  const repos = await prisma.repo.findMany({ where: { id: { in: repoIds }, orgId: org.id } });
  if (repos.length !== repoIds.length) {
    return NextResponse.json({ success: false, error: "One or more repos not in org" }, { status: 400 });
  }

  // Replace assignments
  await prisma.orgMemberRepo.deleteMany({ where: { orgMemberId: memberId } });
  if (repoIds.length > 0) {
    await prisma.orgMemberRepo.createMany({
      data: repoIds.map((repoId) => ({ orgMemberId: memberId, repoId })),
    });
  }

  return NextResponse.json({ success: true, data: { assigned: repoIds.length } });
}
