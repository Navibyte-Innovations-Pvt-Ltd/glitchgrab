import { auth } from "@/lib/auth";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { ConnectRepoDialog } from "./connect-repo-dialog";
import { ReposList } from "./repos-list";

export default async function ReposPage() {
  const session = await auth();
  const isOwner = !!session?.user?.id;

  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="repositories"
        subtitle={
          isOwner
            ? "Connected GitHub repos · source of truth for tokens & reports"
            : "Repositories shared with you"
        }
        meta={isOwner ? "owner view · manage connections" : "collaborator view"}
        action={isOwner ? <ConnectRepoDialog /> : null}
      />
      <ReposList isOwner={isOwner} />
    </div>
  );
}
