export const dynamic = "force-dynamic";

import { BugChat } from "../bug-chat";
import { NoReposState } from "../components/no-repos-state";
import { getDashboardContext } from "../lib/get-dashboard-context";

export default async function ChatPage() {
  const { repos, userName, hasOwnerSession } = await getDashboardContext();

  if (repos.length === 0) {
    return <NoReposState canConnect={hasOwnerSession} />;
  }

  return <BugChat repos={repos} userName={userName} />;
}
