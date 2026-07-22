export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrgContext } from "../lib/get-org-context";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { TesterActivityList } from "./tester-activity-list";

export default async function OrgTesterActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="tester activity"
        subtitle="Work time + bugs filed by testers logged into the Chrome extension"
        meta="owner view · audit log"
      />
      <TesterActivityList />
    </div>
  );
}
