export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ChevronLeft } from "lucide-react";
import { GscConnectWizard } from "@/app/dashboard/seo/connect/gsc-connect-wizard";

export default async function GscConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionId } = await searchParams;
  if (!sessionId) notFound();

  const connectSession = await prisma.gscConnectSession.findFirst({
    where: { id: sessionId },
  });

  if (!connectSession || connectSession.expiresAt < new Date()) {
    notFound();
  }

  const repos = await prisma.repo.findMany({
    where: { userId: connectSession.userId },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const sites = connectSession.sites as Array<{ siteUrl: string; permissionLevel: string }>;

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link
          href="/dashboard/seo"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
        >
          <ChevronLeft className="h-3 w-3" />
          Back to SEO
        </Link>

        <div>
          <h1 className="font-mono text-lg font-medium text-foreground">Connect GSC Properties</h1>
          <p className="font-mono text-[12px] text-muted-foreground mt-1">
            Select which properties to connect and link each to a GitHub repo. Repo is required.
          </p>
        </div>

        <GscConnectWizard sessionId={sessionId} sites={sites} repos={repos} />
      </div>
    </div>
  );
}
