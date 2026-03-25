export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCollabSession } from "@/lib/collab-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitFork } from "lucide-react";
import { ConnectRepoDialog } from "./connect-repo-dialog";

export default async function ReposPage() {
  const session = await auth();
  const collabSession = await getCollabSession();
  const userId = session?.user?.id;
  const isOwner = !!userId;

  // Owner's own repos
  const ownRepos = isOwner
    ? await prisma.repo.findMany({
        where: { userId },
        include: { _count: { select: { tokens: true, reports: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Shared repos (for collaborators)
  const sharedRepos = collabSession
    ? await prisma.collaboratorRepo.findMany({
        where: {
          collaborator: { id: collabSession.collaboratorId, status: "ACCEPTED" },
        },
        include: {
          repo: {
            include: { _count: { select: { tokens: true, reports: true } } },
          },
        },
      })
    : [];

  const connectedGithubIds = ownRepos.map((repo) => repo.githubId);
  const hasAnyRepos = ownRepos.length > 0 || sharedRepos.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Repos</h1>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "Manage your connected GitHub repositories"
              : "Repositories shared with you"}
          </p>
        </div>
        {isOwner && (
          <ConnectRepoDialog connectedGithubIds={connectedGithubIds} />
        )}
      </div>

      {!hasAnyRepos ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GitFork className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No repos yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {isOwner
                ? "Connect a GitHub repo to generate API tokens and start capturing bugs."
                : "No repositories have been shared with you yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Shared repos first for collaborators */}
          {sharedRepos.map((cr) => (
            <Card key={cr.repo.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base truncate min-w-0">{cr.repo.fullName}</CardTitle>
                  <Badge variant="default" className="shrink-0">Shared</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{cr.repo._count.reports} reports</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Owner's own repos */}
          {ownRepos.map((repo) => (
            <Card key={repo.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base truncate min-w-0">{repo.fullName}</CardTitle>
                  <Badge variant={repo.isPrivate ? "secondary" : "outline"} className="shrink-0">
                    {repo.isPrivate ? "Private" : "Public"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{repo._count.tokens} tokens</span>
                  <span>{repo._count.reports} reports</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
