export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { GscPropertyDetail } from "./gsc-property-detail";
import { ChevronLeft } from "lucide-react";

export default async function GscPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const userId = session.user.id;

  const [property, repos] = await Promise.all([
    prisma.gscProperty.findFirst({
      where: { id, userId },
      include: { repo: { select: { id: true, fullName: true } } },
    }),
    prisma.repo.findMany({
      where: { userId },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  if (!property) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/seo"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
      >
        <ChevronLeft className="h-3 w-3" />
        SEO
      </Link>
      <InnerPageHeader
        title={property.siteUrl}
        subtitle="Google Search Console property"
        meta={
          property.lastSyncAt
            ? `last synced ${property.lastSyncAt.toLocaleDateString()}`
            : "never synced"
        }
      />
      <GscPropertyDetail
        property={{
          id: property.id,
          siteUrl: property.siteUrl,
          repoId: property.repoId,
          repo: property.repo,
          indexedCount: property.indexedCount,
          notIndexedCount: property.notIndexedCount,
          lastSyncAt: property.lastSyncAt?.toISOString() ?? null,
          createdAt: property.createdAt.toISOString(),
        }}
        repos={repos}
      />
    </div>
  );
}
