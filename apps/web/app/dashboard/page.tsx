export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitFork, Key, Bug, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [repoCount, tokenCount, reportCount, issueCount] = await Promise.all([
    prisma.repo.count({ where: { userId } }),
    prisma.apiToken.count({ where: { repo: { userId } } }),
    prisma.report.count({ where: { repo: { userId } } }),
    prisma.issue.count({ where: { repo: { userId } } }),
  ]);

  const stats = [
    { label: "Repos", value: repoCount, icon: GitFork },
    { label: "API Tokens", value: tokenCount, icon: Key },
    { label: "Reports", value: reportCount, icon: Bug },
    { label: "Issues Created", value: issueCount, icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session?.user?.name?.split(" ")[0] ?? "there"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {repoCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GitFork className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No repos connected</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Connect a GitHub repo to start capturing bugs and generating
              issues automatically.
            </p>
            <Link href="/dashboard/repos">
              <Button>Connect a Repo</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
