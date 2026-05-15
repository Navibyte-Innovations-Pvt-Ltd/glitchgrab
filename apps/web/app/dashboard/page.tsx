export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardAnalytics } from "./dashboard-analytics";
import { NoReposState } from "./components/no-repos-state";
import { getDashboardContext } from "./lib/get-dashboard-context";

export default async function DashboardPage() {
  const session = await auth();
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
