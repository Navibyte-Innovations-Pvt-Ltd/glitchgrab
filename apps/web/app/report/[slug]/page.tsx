export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicReportForm } from "./public-report-form";

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const apiToken = await prisma.apiToken.findUnique({
    where: { shareSlug: slug },
    select: { repo: { select: { fullName: true } } },
  });

  if (!apiToken) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            report a bug
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            {apiToken.repo.fullName}
          </h1>
        </div>
        <PublicReportForm slug={slug} />
      </div>
    </div>
  );
}
