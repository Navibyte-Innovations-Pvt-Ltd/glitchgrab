export const dynamic = "force-dynamic";

import { getOrgContext } from "../lib/get-org-context";
import { prisma } from "@/lib/db";
import { buildGithubAppInstallUrl } from "@/lib/github-app";
import { OrgRepoList } from "./org-repo-list";
import { GitFork } from "lucide-react";

async function fetchAllGitHubRepos(accessToken: string) {
  const results: { fullName: string; name: string }[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) break;
    const data = (await res.json()) as { full_name: string; name: string }[];
    if (data.length === 0) break;
    for (const r of data) results.push({ fullName: r.full_name, name: r.name });
    if (data.length < 100) break;
    page++;
  }
  return results;
}

export default async function OrgReposPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);

  if (ctx.role === "OWNER") {
    const account = await prisma.account.findFirst({
      where: { userId: ctx.userId, provider: "github" },
      select: { access_token: true },
    });

    const [githubRepos, dbRepos] = await Promise.all([
      account?.access_token ? fetchAllGitHubRepos(account.access_token) : Promise.resolve([]),
      prisma.repo.findMany({
        where: { userId: ctx.userId },
        include: {
          _count: { select: { tokens: true, reports: true } },
          installation: { select: { installationId: true } },
        },
      }),
    ]);

    const dbByFullName = new Map<string, typeof dbRepos[number]>(dbRepos.map((r: typeof dbRepos[number]) => [r.fullName, r]));

    const merged = githubRepos.map((ghRepo) => {
      const db = dbByFullName.get(ghRepo.fullName);
      return {
        fullName: ghRepo.fullName,
        name: ghRepo.name,
        isPrivate: db?.isPrivate ?? false,
        dbId: db?.id ?? null,
        tokens: db?._count.tokens ?? 0,
        reports: db?._count.reports ?? 0,
        tracked: !!db,
        inThisOrg: db?.orgId === ctx.orgId,
        installed: db?.installation !== null && db?.installation !== undefined,
      };
    });

    const needsInstall = merged.some((r) => r.tracked && !r.installed);

    return (
      <OrgRepoList
        repos={merged}
        orgSlug={slug}
        needsInstall={needsInstall}
        installUrl={needsInstall ? buildGithubAppInstallUrl(ctx.userId, ctx.orgGithubId) : null}
      />
    );
  }

  // MEMBER — repos fetched live from GitHub in getOrgContext
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Repos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {ctx.repos.length} repo{ctx.repos.length !== 1 ? "s" : ""} you have access to
        </p>
      </div>
      <div className="space-y-2">
        {ctx.repos.map((repo) => (
          <div key={repo.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
            <GitFork size={16} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-mono font-medium text-foreground truncate">{repo.fullName}</div>
            </div>
          </div>
        ))}
        {ctx.repos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No repos found. Make sure you have access to repos in this org on GitHub.
          </p>
        )}
      </div>
    </div>
  );
}
