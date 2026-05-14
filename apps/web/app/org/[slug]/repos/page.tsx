export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrgContext } from "../lib/get-org-context";
import { prisma } from "@/lib/db";
import { OrgRepoList } from "./org-repo-list";

export default async function OrgReposPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  const repos = await prisma.repo.findMany({
    where: { orgId: ctx.orgId },
    include: { _count: { select: { tokens: true, reports: true } } },
    orderBy: { createdAt: "desc" },
  });

  return <OrgRepoList repos={repos} orgSlug={slug} />;
}
