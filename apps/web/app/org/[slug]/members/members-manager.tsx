"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string | null; image: string | null; githubLogin: string | null };
}

export function MembersManager({
  members,
  orgSlug,
}: {
  members: Member[];
  orgSlug: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Members</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Team members who have connected to this org. Members see repos they have access to on GitHub.
        </p>
      </div>

      <div className="space-y-3">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} orgSlug={orgSlug} />
        ))}
      </div>
    </div>
  );
}

function MemberRow({ member, orgSlug: _ }: { member: Member; orgSlug: string }) {
  const isOwner = member.role === "OWNER";

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
      <Avatar className="h-9 w-9 border border-border shrink-0">
        <AvatarImage src={member.user.image ?? undefined} />
        <AvatarFallback className="font-mono text-xs">
          {(member.user.name ?? member.user.githubLogin ?? "?").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {member.user.name ?? member.user.githubLogin ?? "Unknown"}
          </span>
          <span className={cn(
            "font-mono text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide shrink-0",
            isOwner ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground border-border bg-muted"
          )}>
            {member.role}
          </span>
        </div>
        {member.user.githubLogin && (
          <div className="text-[11px] font-mono text-muted-foreground/70">@{member.user.githubLogin}</div>
        )}
        {member.user.email && (
          <div className="text-[11px] font-mono text-muted-foreground/50 truncate">{member.user.email}</div>
        )}
      </div>
    </div>
  );
}
