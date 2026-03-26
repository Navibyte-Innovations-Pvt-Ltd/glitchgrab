import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { getCollabSession } from "@/lib/collab-auth";
import { getUserPlan, getTrialStatus } from "@/lib/billing";
import type { PlanBadgeType } from "@/components/dashboard/plan-badge";
import { PaywallGuard } from "@/components/dashboard/paywall-guard";

export type UserType = "owner" | "collaborator";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const collabSession = await getCollabSession();

  if (!session?.user && !collabSession) redirect("/login");

  const userType: UserType = session?.user ? "owner" : "collaborator";

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }
    : {
        name: collabSession?.email.split("@")[0] ?? null,
        email: collabSession?.email ?? null,
        image: null as string | null,
      };

  // Resolve plan badge type
  let planBadge: PlanBadgeType = "none";
  let trialDaysLeft = 0;

  if (session?.user?.id) {
    const [plan, trial] = await Promise.all([
      getUserPlan(session.user.id),
      getTrialStatus(session.user.id),
    ]);

    if (plan.isActive) planBadge = "premium";
    else if (trial.inTrial) {
      planBadge = "trial";
      trialDaysLeft = trial.daysLeft;
    }
  }

  return (
    <div className="flex h-(--app-height,100vh) bg-background transition-[height] duration-100">
      <Sidebar user={user} userType={userType} planBadge={planBadge} trialDaysLeft={trialDaysLeft} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <PaywallGuard>{children}</PaywallGuard>
        </main>
        <BottomNav user={user} userType={userType} planBadge={planBadge} trialDaysLeft={trialDaysLeft} />
      </div>
    </div>
  );
}
