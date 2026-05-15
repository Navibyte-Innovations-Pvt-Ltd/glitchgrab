export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrgContext } from "../lib/get-org-context";
import { GscPropertiesClient } from "@/app/dashboard/seo/gsc-properties";

export default async function OrgSeoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const { error, connected } = await searchParams;

  const flashMessage = connected
    ? { type: "success" as const, text: "GSC properties connected successfully" }
    : error
    ? { type: "error" as const, text: "GSC connection failed" }
    : undefined;

  const [properties, repos] = await Promise.all([
    prisma.gscProperty.findMany({
      where: { userId },
      include: { repo: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.repo.findMany({
      where: { userId },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground">SEO</h1>
        <p className="text-sm text-muted-foreground mt-1">Google Search Console integration</p>
      </div>

      <GscPropertiesClient
        initialProperties={properties.map((p) => ({
          id: p.id,
          siteUrl: p.siteUrl,
          repoId: p.repoId,
          repo: p.repo,
          indexedCount: p.indexedCount,
          notIndexedCount: p.notIndexedCount,
          lastSyncAt: p.lastSyncAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        }))}
        repos={repos}
        detailHrefPrefix={`/org/${slug}/seo`}
        flashMessage={flashMessage}
      />
    </div>
  );
}
