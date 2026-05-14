export const dynamic = "force-dynamic";
export const metadata = { title: "SEO · Glitchgrab" };

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { GscPropertiesClient } from "./gsc-properties";

export default async function SeoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

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
      <InnerPageHeader
        title="seo"
        subtitle="Google Search Console integration + MCP server access"
        meta={`${properties.length} properties`}
      />

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-sm text-foreground uppercase tracking-widest">
            Google Search Console
          </h2>
          <div className="h-px bg-border flex-1" />
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
        />
      </section>

    </div>
  );
}
