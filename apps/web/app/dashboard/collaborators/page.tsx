export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { InviteCollaboratorDialog } from "./invite-dialog";
import { RevokeButton } from "./revoke-button";
import { EditReposDialog } from "./edit-repos-dialog";

export default async function CollaboratorsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [collaborators, repos] = await Promise.all([
    prisma.collaborator.findMany({
      where: { invitedById: userId },
      include: {
        repos: {
          include: { repo: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.repo.findMany({
      where: { userId },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "outline",
    ACCEPTED: "default",
    REVOKED: "destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Collaborators</h1>
          <p className="text-sm text-muted-foreground">
            Invite people to report bugs on your repos — no GitHub account needed
          </p>
        </div>
        <InviteCollaboratorDialog
          repos={repos.map((r) => ({ id: r.id, fullName: r.fullName }))}
        />
      </div>

      {collaborators.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No collaborators yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Invite team members or clients by email to let them report bugs
              directly through Glitchgrab.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {collaborators.map((collab) => (
            <Card key={collab.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {collab.email}
                    </span>
                    <Badge variant={statusColor[collab.status]}>
                      {collab.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {collab.repos.map((cr) => (
                      <Badge key={cr.id} variant="secondary" className="text-xs">
                        {cr.repo.fullName}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Invited {new Date(collab.createdAt).toLocaleDateString()}
                    {collab.lastActiveAt && (
                      <> &middot; Last active {new Date(collab.lastActiveAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {collab.status === "ACCEPTED" && (
                    <EditReposDialog
                      collaboratorId={collab.id}
                      email={collab.email}
                      currentRepoIds={collab.repos.map((cr) => cr.repo.id)}
                      allRepos={repos.map((r) => ({ id: r.id, fullName: r.fullName }))}
                    />
                  )}
                  <RevokeButton collaboratorId={collab.id} email={collab.email} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
