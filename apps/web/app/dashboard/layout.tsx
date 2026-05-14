import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { getUserPlan, getTrialStatus } from "@/lib/billing";
import type { PlanBadgeType } from "@/components/dashboard/plan-badge";
import { PaywallGuard } from "@/components/dashboard/paywall-guard";
import { DashboardStatusBar } from "@/components/dashboard/dashboard-status-bar";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  // Fallback org redirect for sessions created before orgSlug was cached in JWT
  // (proxy.ts handles the fast path; this catches users who haven't re-logged-in)
  if (session.user.id) {
    const membership = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
      select: { org: { select: { githubOrgLogin: true } } },
    });
    if (membership) {
      const headersList = await headers();
      const currentPath = headersList.get("x-pathname") ?? "/dashboard";
      const subPath = currentPath.slice("/dashboard".length);
      const CONFIG_PATHS = ["/settings", "/tokens", "/billing", "/members"];
      if (!CONFIG_PATHS.some((p) => subPath.startsWith(p))) {
        redirect(`/org/${membership.org.githubOrgLogin}${subPath}`);
      }
    }
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  // Resolve plan badge type
  let planBadge: PlanBadgeType = "none";
  let trialDaysLeft = 0;

  if (session.user.id) {
    const plan = await getUserPlan(session.user.id);
    const trial = await getTrialStatus(session.user.id, plan);

    if (plan.isActive) planBadge = "premium";
    else if (trial.inTrial) {
      planBadge = "trial";
      trialDaysLeft = trial.daysLeft;
    }
  }

  return (
    <div className="flex h-(--app-height,100vh) bg-background transition-[height] duration-100">
      <Sidebar user={user} planBadge={planBadge} trialDaysLeft={trialDaysLeft} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardStatusBar />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <PaywallGuard>{children}</PaywallGuard>
        </main>
        <BottomNav user={user} planBadge={planBadge} trialDaysLeft={trialDaysLeft} />
      </div>
    </div>
  );
}
