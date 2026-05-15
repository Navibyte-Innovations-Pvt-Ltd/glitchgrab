export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { githubOrgLogin: slug },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, githubLogin: true } },
        },
      },
      repos: {
        select: { id: true, fullName: true, name: true, isPrivate: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!org) return NextResponse.json({ success: false, error: "Org not found" }, { status: 404 });

  // Verify requester is a member
  const userId = session.user?.id as string;
  const isMember = org.members.some((m) => m.userId === userId);
  if (!isMember) return NextResponse.json({ success: false, error: "Not a member" }, { status: 403 });

  return NextResponse.json({ success: true, data: org });
}
