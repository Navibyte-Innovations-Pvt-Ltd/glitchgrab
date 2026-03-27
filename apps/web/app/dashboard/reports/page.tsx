import { auth } from "@/lib/auth";
import { ReportsList } from "./reports-list";

export default async function ReportsPage() {
  const session = await auth();
  const isOwner = !!session?.user?.id;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Bug reports and issues created
        </p>
      </div>
      <ReportsList isOwner={isOwner} />
    </div>
  );
}
