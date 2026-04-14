export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Check,
  ChevronRight,
  Clock,
  GitFork,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
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

  const activeCount = collaborators.filter((c) => c.status === "ACCEPTED").length;
  const pendingCount = collaborators.filter((c) => c.status === "PENDING").length;
  const revokedCount = collaborators.filter((c) => c.status === "REVOKED").length;

  const allRepos = repos.map((r) => ({ id: r.id, fullName: r.fullName }));

  return (
    <div className="space-y-6">
      <InnerPageHeader
        segment="collaborators"
        icon={Users}
        title="collaborators"
        subtitle="Invite people to report bugs on your repos — no GitHub account needed"
        meta={
          <>
            {activeCount} active · {pendingCount} pending
            {revokedCount > 0 ? ` · ${revokedCount} revoked` : ""}
          </>
        }
        action={<InviteCollaboratorDialog repos={allRepos} />}
      />

      {collaborators.length === 0 ? (
        <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-mono text-sm text-foreground mb-2">
            no collaborators yet
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-6">
            Invite team members or clients by email to let them report bugs
            directly through Glitchgrab.
          </p>
          <InviteCollaboratorDialog repos={allRepos} />
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-2">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              <span>{activeCount} active</span>
              <span> · {pendingCount} pending</span>
              {revokedCount > 0 && <span> · {revokedCount} revoked</span>}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              {collaborators.length} results
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-[3fr_1fr_1fr_auto] gap-4 font-mono text-[10px] text-muted-foreground uppercase tracking-widest pl-5 pr-8 pb-3 mb-1">
            <div>collaborator / metadata</div>
            <div>access</div>
            <div>invited</div>
            <div className="text-right">status</div>
          </div>

          <div className="flex flex-col gap-1">
            {collaborators.map((collab) => {
              const status = collab.status as "PENDING" | "ACCEPTED" | "REVOKED";
              const stripClass =
                status === "ACCEPTED"
                  ? "bg-primary shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                  : status === "PENDING"
                    ? "bg-amber-400"
                    : "bg-red-500";

              const statusChip =
                status === "ACCEPTED" ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[10px] uppercase tracking-wider">
                    <Check className="h-3 w-3" />
                    accepted
                  </div>
                ) : status === "PENDING" ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] uppercase tracking-wider">
                    <Clock className="h-3 w-3" />
                    pending
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] uppercase tracking-wider">
                    <X className="h-3 w-3" />
                    revoked
                  </div>
                );

              const roleLabel =
                status === "ACCEPTED" ? "member" : status === "PENDING" ? "invited" : "removed";

              const invitedDate = new Date(collab.createdAt).toLocaleDateString();
              const lastActive = collab.lastActiveAt
                ? new Date(collab.lastActiveAt).toLocaleDateString()
                : null;

              return (
                <div
                  key={collab.id}
                  className={`data-row group relative grid grid-cols-[auto_1fr_auto_40px] sm:grid-cols-[auto_1fr_auto_auto_auto_40px] items-center gap-y-1 p-3 rounded bg-transparent hover:bg-card/60 border border-transparent hover:border-border/50 transition-colors ${
                    status === "REVOKED" ? "opacity-70 hover:opacity-100" : ""
                  }`}
                >
                  <div className={`absolute inset-y-2 left-[2px] w-[2px] ${stripClass}`} />
                  <Avatar className="h-8 w-8 rounded border border-border bg-card mr-4 shrink-0">
                    <AvatarFallback
                      className={`font-mono text-xs rounded bg-card ${
                        status === "ACCEPTED"
                          ? "text-primary"
                          : status === "PENDING"
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {collab.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-mono text-sm font-medium text-foreground truncate ${
                          status === "REVOKED" ? "line-through decoration-border" : ""
                        }`}
                      >
                        {collab.email}
                      </span>
                      <span className="px-1.5 py-px rounded bg-muted text-[9px] font-mono text-muted-foreground uppercase border border-border">
                        {roleLabel}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" />
                        {collab.repos.length}{" "}
                        {collab.repos.length === 1 ? "repo" : "repos"}
                      </span>
                      <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
                      <span className="truncate">invited {invitedDate}</span>
                      {lastActive && (
                        <>
                          <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
                          <span className="truncate">active {lastActive}</span>
                        </>
                      )}
                      <span className="sm:hidden w-full" />
                    </div>
                  </div>
                  <div className="hidden sm:block font-mono text-[11px] text-muted-foreground tabular-nums mr-8">
                    {collab.repos.length}{" "}
                    {collab.repos.length === 1 ? "repo" : "repos"}
                  </div>
                  <div className="hidden sm:block font-mono text-[11px] text-muted-foreground tabular-nums mr-8">
                    {invitedDate}
                  </div>
                  {statusChip}
                  <div className="flex items-center justify-end gap-1 pr-1 opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                    {status === "ACCEPTED" && (
                      <EditReposDialog
                        collaboratorId={collab.id}
                        email={collab.email}
                        currentRepoIds={collab.repos.map((cr) => cr.repo.id)}
                        allRepos={allRepos}
                      />
                    )}
                    {status !== "REVOKED" && (
                      <RevokeButton
                        collaboratorId={collab.id}
                        email={collab.email}
                      />
                    )}
                    {status === "REVOKED" && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
