export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitFork } from "lucide-react";
import { ConnectRepoDialog } from "./connect-repo-dialog";

export default async function ReposPage() {
  const session = await auth();
  const repos = await prisma.repo.findMany({
    where: { userId: session?.user?.id },
    include: {
      _count: { select: { tokens: true, reports: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const connectedGithubIds = repos.map((repo) => repo.githubId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Repos</h1>
          <p className="text-sm text-muted-foreground">
            Manage your connected GitHub repositories
          </p>
        </div>
        <ConnectRepoDialog connectedGithubIds={connectedGithubIds} />
      </div>

      {repos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GitFork className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No repos yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Connect a GitHub repo to generate API tokens and start capturing
              bugs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {repos.map((repo: typeof repos[number]) => (
            <Card key={repo.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{repo.fullName}</CardTitle>
                  <Badge variant={repo.isPrivate ? "secondary" : "outline"}>
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
