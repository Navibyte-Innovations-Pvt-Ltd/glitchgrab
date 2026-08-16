export const dynamic = "force-dynamic";

import { getOrgContext } from "../lib/get-org-context";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { ContextTimeline } from "./context-timeline";

/**
 * Per-project memory (#311 Phase A).
 *
 * NOTE the access model: this page renders inside the org shell, but it does
 * NOT inherit the org gate for its data. Every item shown comes from
 * `/api/v1/project-context`, which scopes on `lib/repo-access` — repo owner OR
 * an explicit `RepoMember` grant. An org member with neither sees an empty
 * timeline, by design: client-call material is more sensitive than bug reports.
 */
export default async function OrgContextPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);

  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="context"
        subtitle="What the client asked for, what we decided, what we promised"
        meta="per-project memory · repo-scoped access"
      />
      <ContextTimeline orgSlug={ctx.orgSlug} />
    </div>
  );
}
