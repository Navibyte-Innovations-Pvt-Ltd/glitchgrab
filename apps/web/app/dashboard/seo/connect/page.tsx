export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChevronLeft } from "lucide-react";
import { GscConnectWizard } from "./gsc-connect-wizard";

export default async function GscConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { session: sessionId } = await searchParams;
  if (!sessionId) redirect("/dashboard/seo");

  const connectSession = await prisma.gscConnectSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });

  if (!connectSession || connectSession.expiresAt < new Date()) {
    notFound();
  }

  const repos = await prisma.repo.findMany({
    where: { userId: session.user.id },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const sites = connectSession.sites as Array<{ siteUrl: string; permissionLevel: string }>;

  return (
    <div className="space-y-8 max-w-2xl">
      <Link
        href="/dashboard/seo"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
      >
        <ChevronLeft className="h-3 w-3" />
        SEO
      </Link>

      <div>
        <h1 className="font-mono text-lg font-medium text-foreground">Connect GSC Properties</h1>
        <p className="font-mono text-[12px] text-muted-foreground mt-1">
          Select which properties to connect and link each to a GitHub repo. Repo is required.
        </p>
      </div>

      <GscConnectWizard sessionId={sessionId} sites={sites} repos={repos} />
    </div>
  );
}
