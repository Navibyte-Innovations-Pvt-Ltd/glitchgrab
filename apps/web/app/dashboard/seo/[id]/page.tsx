export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GscPropertyDetail } from "./gsc-property-detail";

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
        cachedNotIndexedPages: (property.cachedNotIndexedPages as { url: string; reason?: string }[] | null) ?? null,
      }}
      repos={repos}
      backHref="/dashboard/seo"
    />
  );
}
