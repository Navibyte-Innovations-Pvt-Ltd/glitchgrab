import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { ReportsList } from "./reports-list";

export default async function ReportsPage() {
  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="reports"
        subtitle="Bug reports captured via SDK and dashboard"
        meta="owner view · product issues"
      />
      <ReportsList />
    </div>
  );
}
