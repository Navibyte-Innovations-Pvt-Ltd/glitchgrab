import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
type OrgRole = "OWNER" | "MEMBER";

const GITHUB_API = "https://api.github.com";

async function fetchUserRepos(accessToken: string): Promise<OrgRepo[]> {
  const results: OrgRepo[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${GITHUB_API}/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) break;
    const data = (await res.json()) as { id: number; full_name: string; owner: { login: string }; name: string }[];
    if (data.length === 0) break;
    for (const r of data) {
      results.push({ id: r.id.toString(), fullName: r.full_name, owner: r.owner.login, name: r.name });
    }
    if (data.length < 100) break;
    page++;
  }
  return results;
}

interface OrgRepo {
  id: string;
  fullName: string;
  owner: string;
  name: string;
}

export interface OrgContext {
  orgId: string;
  orgGithubId: number;
  orgName: string;
  orgSlug: string;
  userId: string;
  userName: string;
  userImage: string | null;
  userEmail: string | null;
  role: OrgRole;
  repos: OrgRepo[];
}

export async function getOrgContext(slug: string): Promise<OrgContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) redirect("/dashboard");

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!member) redirect("/dashboard");

  let repos: OrgRepo[];

  if (member.role === "OWNER") {
    repos = await prisma.repo.findMany({
      where: { orgId: org.id },
      select: { id: true, fullName: true, owner: true, name: true },
      orderBy: { createdAt: "desc" },
    });
  } else {
    // Fetch live from GitHub — returns all repos the member can access (personal + org)
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
      select: { access_token: true },
    });
    repos = account?.access_token ? await fetchUserRepos(account.access_token) : [];
  }

  return {
    orgId: org.id,
    orgGithubId: org.githubOrgId,
    orgName: org.name,
    orgSlug: org.githubOrgLogin,
    userId: session.user.id,
    userName: session.user.name?.split(" ")[0] ?? "there",
    userImage: session.user.image ?? null,
    userEmail: session.user.email ?? null,
    role: member.role,
  repos,
  };
}
