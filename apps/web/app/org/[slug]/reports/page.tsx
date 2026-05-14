export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrgContext } from "../lib/get-org-context";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { ReportsList } from "@/app/dashboard/reports/reports-list";

export default async function OrgReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="reports"
        subtitle="Bug reports captured via SDK and dashboard"
        meta="owner view · product issues + my reports"
      />
      <ReportsList />
    </div>
  );
}
