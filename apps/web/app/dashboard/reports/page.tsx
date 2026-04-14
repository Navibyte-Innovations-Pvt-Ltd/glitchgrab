import { ClipboardList } from "lucide-react";
import { auth } from "@/lib/auth";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { ReportsList } from "./reports-list";

export default async function ReportsPage() {
  const session = await auth();
  const isOwner = !!session?.user?.id;

  return (
    <div className="space-y-6">
      <InnerPageHeader
        segment="reports"
        icon={ClipboardList}
        title="reports"
        subtitle={
          isOwner
            ? "Bug reports captured via SDK, dashboard & collaborators"
            : "Reports you have submitted"
        }
        meta={isOwner ? "owner view · product issues + my reports" : "collaborator view"}
      />
      <ReportsList isOwner={isOwner} />
    </div>
  );
}
