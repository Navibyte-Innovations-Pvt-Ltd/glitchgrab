export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BugChat } from "./bug-chat";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GitFork } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const repos = await prisma.repo.findMany({
    where: { userId },
    select: { id: true, fullName: true, owner: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  if (repos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="border-dashed max-w-sm w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GitFork className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No repos connected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect a GitHub repo to start reporting bugs.
            </p>
            <Link href="/dashboard/repos">
              <Button>Connect a Repo</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <BugChat
      repos={repos}
      userName={session?.user?.name?.split(" ")[0] ?? "there"}
    />
  );
}
