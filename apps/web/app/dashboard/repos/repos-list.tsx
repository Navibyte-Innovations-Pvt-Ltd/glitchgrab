"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitFork, Loader2 } from "lucide-react";

interface Repo {
  id: string;
  githubId: number;
  fullName: string;
  isPrivate: boolean;
  tokens: number;
  reports: number;
}

interface ReposData {
  ownRepos: Repo[];
  sharedRepos: Repo[];
}

export function ReposList({ isOwner }: { isOwner: boolean }) {
  const { data, isLoading, isFetching } = useQuery<ReposData>({
    queryKey: ["repos"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/repos");
      return data.data;
    },
  });

  const ownRepos = data?.ownRepos ?? [];
  const sharedRepos = data?.sharedRepos ?? [];
  const hasAnyRepos = ownRepos.length > 0 || sharedRepos.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAnyRepos) {
    return (
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
    );
  }

  return (
    <div className="relative">
      {isFetching && !isLoading && (
        <div className="absolute top-0 right-0">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {sharedRepos.map((repo) => (
          <Card key={repo.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <CardTitle className="text-base truncate min-w-0">{repo.fullName}</CardTitle>
                <Badge variant="default" className="shrink-0">Shared</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{repo.reports} reports</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {ownRepos.map((repo) => (
          <Card key={repo.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <CardTitle className="text-base truncate min-w-0">{repo.fullName}</CardTitle>
                <Badge variant={repo.isPrivate ? "secondary" : "outline"} className="shrink-0">
                  {repo.isPrivate ? "Private" : "Public"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{repo.tokens} tokens</span>
                <span>{repo.reports} reports</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
