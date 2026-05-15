export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrgContext } from "../lib/get-org-context";
import { IssuesClosedAnalytics } from "@/app/dashboard/analytics/issues-closed-analytics";

export default async function OrgAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  return <IssuesClosedAnalytics />;
}
