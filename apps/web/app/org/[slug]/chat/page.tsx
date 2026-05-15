export const dynamic = "force-dynamic";

import { getOrgContext } from "../lib/get-org-context";
import { BugChat } from "@/app/dashboard/bug-chat";

export default async function OrgChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);

  if (ctx.repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <p className="text-muted-foreground text-sm">
          {ctx.role === "OWNER"
            ? "No repos synced yet. Go to Settings → Sync Repos."
            : "No repos assigned to you yet. Ask your org owner to assign repos."}
        </p>
      </div>
    );
  }

  return <BugChat repos={ctx.repos} userName={ctx.userName} />;
}
