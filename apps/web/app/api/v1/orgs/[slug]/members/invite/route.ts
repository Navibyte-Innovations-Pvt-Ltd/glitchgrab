export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendOrgMemberInvite } from "@/lib/mail";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { email, githubLogin } = (await request.json()) as { email: string; githubLogin: string };

  if (!email?.trim() || !githubLogin?.trim()) {
    return NextResponse.json({ success: false, error: "email and githubLogin required" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  // Only OWNER can invite
  const requester = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!requester || requester.role !== "OWNER") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://glitchgrab.dev";
  const loginUrl = `${baseUrl}/login`;

  await sendOrgMemberInvite(
    email.trim(),
    session.user.name ?? "Your teammate",
    org.name,
    githubLogin.trim(),
    loginUrl
  );

  return NextResponse.json({ success: true });
}
