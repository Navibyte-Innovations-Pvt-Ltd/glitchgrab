import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCollabSession } from "@/lib/collab-auth";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldX } from "lucide-react";
import { CollaborateReportForm } from "./report-form";

export default async function CollaboratePage() {
  const session = await getCollabSession();

  if (!session) {
    redirect("/login");
  }

  // Verify collaborator is still active
  const collaborator = await prisma.collaborator.findFirst({
    where: {
      id: session.collaboratorId,
      status: "ACCEPTED",
    },
    include: {
      repos: {
        include: {
          repo: { select: { id: true, fullName: true, owner: true, name: true } },
        },
      },
      invitedBy: { select: { name: true } },
    },
  });

  if (!collaborator) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center text-center py-12">
          <ShieldX className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access revoked</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your collaborator access has been revoked. Contact the repository
            owner for a new invitation.
          </p>
        </CardContent>
      </Card>
    );
  }

  const repos = collaborator.repos.map((cr) => ({
    id: cr.repo.id,
    fullName: cr.repo.fullName,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Report a Bug</h1>
        <p className="text-sm text-muted-foreground">
          Reporting as <span className="font-medium text-foreground">{session.email}</span>
          {collaborator.invitedBy.name && (
            <> &middot; Invited by {collaborator.invitedBy.name}</>
          )}
        </p>
      </div>

      <CollaborateReportForm repos={repos} />
    </div>
  );
}
