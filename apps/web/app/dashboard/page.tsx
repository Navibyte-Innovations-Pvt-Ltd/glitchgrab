export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCollabSession } from "@/lib/collab-auth";
import { BugChat } from "./bug-chat";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GitFork } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const collabSession = await getCollabSession();

  let repos: { id: string; fullName: string; owner: string; name: string }[];
  let userName: string;

  if (session?.user?.id) {
    // Owner: show their own repos
    repos = await prisma.repo.findMany({
      where: { userId: session.user.id },
      select: { id: true, fullName: true, owner: true, name: true },
      orderBy: { createdAt: "desc" },
    });
    userName = session.user.name?.split(" ")[0] ?? "there";
  } else if (collabSession) {
    // Collaborator: show shared repos from owner
    const collabRepos = await prisma.collaboratorRepo.findMany({
      where: {
        collaborator: {
          id: collabSession.collaboratorId,
          status: "ACCEPTED",
        },
      },
      include: {
        repo: { select: { id: true, fullName: true, owner: true, name: true } },
      },
    });
    repos = collabRepos.map((cr) => cr.repo);
    userName = collabSession.email.split("@")[0];
  } else {
    repos = [];
    userName = "there";
  }

  if (repos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="border-dashed max-w-sm w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GitFork className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No repos connected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {collabSession
                ? "No repositories have been shared with you yet."
                : "Connect a GitHub repo to start reporting bugs."}
            </p>
            {!collabSession && (
              <Link href="/dashboard/repos">
                <Button>Connect a Repo</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <BugChat repos={repos} userName={userName} />;
}
