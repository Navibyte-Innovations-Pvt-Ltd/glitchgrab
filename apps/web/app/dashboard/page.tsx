export const dynamic = "force-dynamic";

import { DashboardAnalytics } from "./dashboard-analytics";
import { NoReposState } from "./components/no-repos-state";
import { getDashboardContext } from "./lib/get-dashboard-context";

export default async function DashboardPage() {
  const { repos, hasOwnerSession, hasCollabOnly } = await getDashboardContext();

  if (repos.length === 0) {
    return <NoReposState canConnect={hasOwnerSession} collaboratorOnly={hasCollabOnly} />;
  }

  return <DashboardAnalytics />;
}
