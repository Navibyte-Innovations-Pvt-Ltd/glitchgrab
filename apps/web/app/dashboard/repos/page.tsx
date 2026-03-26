import { auth } from "@/lib/auth";
import { ConnectRepoDialog } from "./connect-repo-dialog";
import { ReposList } from "./repos-list";

export default async function ReposPage() {
  const session = await auth();
  const isOwner = !!session?.user?.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Repos</h1>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "Manage your connected GitHub repositories"
              : "Repositories shared with you"}
          </p>
        </div>
        {isOwner && <ConnectRepoDialog />}
      </div>
      <ReposList isOwner={isOwner} />
    </div>
  );
}
