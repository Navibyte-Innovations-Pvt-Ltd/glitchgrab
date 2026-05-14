import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import type { OrgRole } from "@prisma/client";

export interface OrgRepo {
  id: string;
  fullName: string;
  owner: string;
  name: string;
}

export interface OrgContext {
  orgId: string;
  orgName: string;
  orgSlug: string;
  userId: string;
  userName: string;
  userImage: string | null;
  userEmail: string | null;
  role: OrgRole;
  repos: OrgRepo[];
}

export async function getOrgContext(slug: string): Promise<OrgContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) redirect("/dashboard");

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!member) redirect("/dashboard");

  let repos: OrgRepo[];

  if (member.role === "OWNER") {
    repos = await prisma.repo.findMany({
      where: { orgId: org.id },
      select: { id: true, fullName: true, owner: true, name: true },
      orderBy: { createdAt: "desc" },
    });
  } else {
    const assigned = await prisma.orgMemberRepo.findMany({
      where: { orgMemberId: member.id },
      include: { repo: { select: { id: true, fullName: true, owner: true, name: true } } },
    });
    repos = assigned.map((r) => r.repo);
  }

  return {
    orgId: org.id,
    orgName: org.name,
    orgSlug: org.githubOrgLogin,
    userId: session.user.id,
    userName: session.user.name?.split(" ")[0] ?? "there",
    userImage: session.user.image ?? null,
    userEmail: session.user.email ?? null,
    role: member.role,
  repos,
  };
}
