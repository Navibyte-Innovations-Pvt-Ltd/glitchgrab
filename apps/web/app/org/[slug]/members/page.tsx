export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrgContext } from "../lib/get-org-context";
import { MembersManager } from "./members-manager";
import { TestersManager } from "./testers-manager";
import { prisma } from "@/lib/db";
import { qaLink } from "@/lib/qa";

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);

  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  const [members, testers, repos] = await Promise.all([
    prisma.orgMember.findMany({
      where: { orgId: ctx.orgId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, githubLogin: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tester.findMany({
      where: { orgId: ctx.orgId },
      include: {
        repos: { include: { repo: { select: { id: true, fullName: true } } } },
        _count: { select: { checks: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.repo.findMany({
      where: { orgId: ctx.orgId },
      select: { id: true, fullName: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const testerData = testers.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    qaUrl: qaLink(t.magicToken),
    repos: t.repos.map((r) => ({ id: r.repo.id, fullName: r.repo.fullName })),
    checkCount: t._count.checks,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-10">
      <MembersManager members={members} orgSlug={slug} />
      <TestersManager orgSlug={slug} initialTesters={testerData} repos={repos} />
    </div>
  );
}
