export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  ChevronRight,
  GitFork,
  Key,
  KeyRound,
  Shield,
} from "lucide-react";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { CreateTokenDialog } from "./create-token-dialog";
import { DeleteTokenButton } from "./delete-token-button";
import Link from "next/link";

export default async function TokensPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const ownerName =
    session?.user?.name?.split(" ")[0]?.toLowerCase() ?? "owner";

  const repos = await prisma.repo.findMany({
    where: { userId },
    select: { id: true, fullName: true },
    orderBy: { createdAt: "desc" },
  });

  const tokens = await prisma.apiToken.findMany({
    where: { repo: { userId } },
    include: { repo: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const activeCount = tokens.length;
  const capacity = Math.max(10, activeCount);

  return (
    <div className="space-y-6">
      <InnerPageHeader
        segment="tokens"
        icon={KeyRound}
        title="api_tokens"
        subtitle="Manage programmable access keys for the Glitchgrab SDK"
        meta={
          repos.length === 0
            ? "connect a repo to begin"
            : `${activeCount} / ${capacity} active tokens`
        }
        action={repos.length > 0 ? <CreateTokenDialog repos={repos} /> : null}
      />

      {repos.length === 0 ? (
        <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
            <GitFork className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-mono text-sm text-foreground mb-2">
            no repositories connected
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-6">
            You need at least one connected repo to generate API tokens. Each
            token is scoped to exactly one repo.
          </p>
          <Link
            href="/dashboard/repos"
            className="font-mono text-[11px] uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 px-4 py-2 rounded hover:bg-primary/20 transition-colors"
          >
            Connect a Repo
          </Link>
        </div>
      ) : tokens.length === 0 ? (
        <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
            <Key className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-mono text-sm text-foreground mb-2">
            no api tokens yet
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-6">
            Generate a scoped token per repo. Tokens are shown exactly once —
            copy them immediately.
          </p>
          <CreateTokenDialog repos={repos} />
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-2">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              <span>
                {activeCount} {activeCount === 1 ? "token" : "tokens"} · scoped
                to {repos.length} {repos.length === 1 ? "repo" : "repos"}
              </span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              <span>{activeCount} results</span>
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-[3fr_1fr_1fr_auto] gap-4 font-mono text-[10px] text-muted-foreground uppercase tracking-widest pl-5 pr-8 pb-3 mb-1">
            <div>identifier / metadata</div>
            <div>repo</div>
            <div>created</div>
            <div className="text-right">status</div>
          </div>

          <div className="flex flex-col gap-1">
            {tokens.map((token) => (
              <TokenRow
                key={token.id}
                id={token.id}
                name={token.name}
                repoFullName={token.repo.fullName}
                createdAt={token.createdAt}
                lastUsed={token.lastUsed}
                ownerName={ownerName}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TokenRowProps {
  id: string;
  name: string;
  repoFullName: string;
  createdAt: Date;
  lastUsed: Date | null;
  ownerName: string;
}

function TokenRow({
  id,
  name,
  repoFullName,
  createdAt,
  lastUsed,
  ownerName,
}: TokenRowProps) {
  const tokenLabel = `tok_${id.slice(0, 10)}`;
  const createdLabel = formatRelative(createdAt);
  const lastUsedLabel = lastUsed ? formatRelative(lastUsed) : "never used";

  return (
    <div className="data-row group relative grid grid-cols-[auto_1fr_auto_40px] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-y-1 p-3 rounded bg-transparent hover:bg-card/60 border border-transparent hover:border-border/50 transition-colors">
      <div className="absolute inset-y-2 left-0.5 w-0.5 bg-primary shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
      <div className="w-8 h-8 rounded border border-border bg-card flex items-center justify-center text-muted-foreground mr-4 shrink-0">
        <Key className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {name}
          </span>
          <span className="px-1.5 py-px rounded bg-muted text-[9px] font-mono text-muted-foreground uppercase border border-border flex items-center gap-1">
            <Shield className="h-2.5 w-2.5" />
            write
          </span>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <span className="truncate">{tokenLabel}</span>
          <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
          <span className="sm:hidden truncate flex items-center gap-1">
            <GitFork className="h-2.5 w-2.5" />
            {repoFullName}
          </span>
          <span className="sm:hidden w-0.75 h-0.75 rounded-full bg-border shrink-0" />
          <span className="truncate">owner: {ownerName}</span>
          <span className="w-0.75 h-0.75 rounded-full bg-border shrink-0" />
          <span className="truncate">last used: {lastUsedLabel}</span>
        </div>
      </div>
      <div className="hidden sm:flex font-mono text-[11px] text-muted-foreground items-center gap-1.5 tabular-nums mr-8 min-w-0">
        <GitFork className="h-3 w-3 shrink-0" />
        <span className="truncate">{repoFullName}</span>
      </div>
      <div className="hidden sm:block font-mono text-[11px] text-muted-foreground tabular-nums mr-8">
        {createdLabel}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary font-mono text-[10px] uppercase tracking-wider">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        active
      </div>
      <div className="flex justify-end pl-2">
        <DeleteTokenButton tokenId={id} />
      </div>
      <ChevronRight className="hidden sm:hidden h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
