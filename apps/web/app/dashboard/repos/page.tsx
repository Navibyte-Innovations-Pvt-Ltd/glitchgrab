import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { ConnectRepoDialog } from "./connect-repo-dialog";
import { ReposList } from "./repos-list";

export default async function ReposPage() {
  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="repositories"
        subtitle="Connected GitHub repos · source of truth for tokens & reports"
        meta="owner view · manage connections"
        action={<ConnectRepoDialog />}
      />
      <ReposList isOwner={true} />
    </div>
  );
}
