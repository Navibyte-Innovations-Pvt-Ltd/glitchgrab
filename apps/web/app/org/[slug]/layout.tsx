import { getOrgContext } from "./lib/get-org-context";
import { OrgSidebar } from "./org-sidebar";
import { OrgBottomNav } from "./org-bottom-nav";
import { PhonePromptDialog } from "@/components/dashboard/phone-prompt-dialog";
import { DashboardStatusBar } from "@/components/dashboard/dashboard-status-bar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [ctx, session] = await Promise.all([getOrgContext(slug), auth()]);
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { whatsappPhone: true },
      })
    : null;

  return (
    <div className="flex h-(--app-height,100vh) bg-background transition-[height] duration-100">
      <OrgSidebar ctx={ctx} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardStatusBar />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {/*
            NOTE: there is deliberately no <PaywallGuard> here.

            The trial gate only ever wrapped /dashboard, and owners have worked
            in /org/<slug>/* for a long time — so Pro has been effectively free
            on every page anyone actually uses, and deleting the dashboard owner
            surface did not change that.

            Wrapping children in PaywallGuard here would switch the paywall on
            for the first time, not restore it: getUserPlan() returns
            "dev-bypass" whenever NODE_ENV is development (lib/billing.ts), so
            the block is invisible locally and would first appear in production,
            locking out any owner past their 7-day trial without an active
            Razorpay subscription. That is a billing decision — make it on
            purpose, and verify the owner account's subscription first.
          */}
          {children}
        </main>
      </div>
      <OrgBottomNav ctx={ctx} />
      <PhonePromptDialog hasPhone={!!dbUser?.whatsappPhone} />
    </div>
  );
}
