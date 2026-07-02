export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
