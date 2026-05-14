export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrgContext } from "../lib/get-org-context";
import { MembersManager } from "./members-manager";
import { prisma } from "@/lib/db";

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);

  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  const members = await prisma.orgMember.findMany({
    where: { orgId: ctx.orgId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, githubLogin: true } },
      repos: { include: { repo: { select: { id: true, fullName: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const orgRepos = await prisma.repo.findMany({
    where: { orgId: ctx.orgId },
    select: { id: true, fullName: true, name: true },
    orderBy: { fullName: "asc" },
  });

  return <MembersManager members={members} orgRepos={orgRepos} orgSlug={slug} />;
}
