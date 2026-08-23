export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardAnalytics } from "./dashboard-analytics";
import { NoReposState } from "./components/no-repos-state";
import { getDashboardContext } from "./lib/get-dashboard-context";
import { getTesterSession } from "@/lib/tester-session";
import { getQaView } from "@/lib/qa-view";
import { QaClient } from "@/app/qa/qa-client";

export default async function DashboardPage() {
  const session = await auth();

  // Tester home. A tester has no NextAuth session, so this branch runs before
  // any owner query — the dashboard is the ONLY page they can reach (proxy.ts
  // bounces every sub-path), which is the point: no more /qa/<token> link that
  // lives outside the product.
  if (!session?.user) {
    const testerId = await getTesterSession();
    const view = testerId ? await getQaView(testerId) : null;
    if (view) {
      return (
        <QaClient
          testerName={view.testerName}
          testerEmail={view.testerEmail}
          testerPhone={view.testerPhone}
          orgName={view.orgName}
          checks={view.checks}
          embedded
        />
      );
    }
  }

  if (session?.user?.id) {
    const membership = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
      include: { org: true },
    });
    if (membership) {
      const dest = membership.role === "MEMBER"
        ? `/org/${membership.org.githubOrgLogin}/chat`
        : `/org/${membership.org.githubOrgLogin}`;
      redirect(dest);
    }
  }

  const { repos, hasOwnerSession } = await getDashboardContext();

  if (repos.length === 0) {
    return <NoReposState canConnect={hasOwnerSession} />;
  }

  return <DashboardAnalytics />;
}
