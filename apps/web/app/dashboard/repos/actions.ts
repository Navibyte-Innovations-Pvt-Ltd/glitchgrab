"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildGithubAppInstallUrl, getInstallationAccessToken } from "@/lib/github-app";
import { revalidatePath } from "next/cache";

export async function resyncRepo(repoId: string): Promise<{
  fullName: string;
  owner: string;
  name: string;
  changed: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const repo = await prisma.repo.findFirst({
    where: { id: repoId, userId: session.user.id },
    include: { installation: { select: { installationId: true } } },
  });
  if (!repo) throw new Error("Repo not found");

  // Prefer the installation token (own rate-limit bucket) when the App is
  // installed on this repo's owner; otherwise fall back to OAuth discovery —
  // this is the one case where OAuth is the only option, since no installation
  // exists yet to check whether the repo moved.
  let token: string;
  if (repo.installation) {
    token = await getInstallationAccessToken(repo.installation.installationId);
  } else {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
    });
    if (!account?.access_token) throw new Error("GitHub account not linked");
    token = account.access_token;
  }

  const res = await fetch(
    `https://api.github.com/repositories/${repo.githubId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      `[resyncRepo] GitHub ${res.status} for repo id=${repo.githubId} (${repo.fullName}):`,
      body
    );
    if (res.status === 404) {
      throw new Error(
        "Can't see this repo — if it was transferred to an org, click RECONNECT in Connect Repo dialog to refresh GitHub access"
      );
    }
    if (res.status === 401) {
      throw new Error(
        "GitHub token expired — click RECONNECT in Connect Repo dialog to re-authenticate"
      );
    }
    if (res.status === 403) {
      throw new Error(
        "GitHub denied access (rate limit or org OAuth policy). Click ADD ORG in Connect Repo dialog to grant access."
      );
    }
    throw new Error(`Failed to fetch repo from GitHub (${res.status})`);
  }

  const gh = (await res.json()) as {
    full_name: string;
    name: string;
    owner: { login: string };
    private: boolean;
  };

  const changed =
    gh.full_name !== repo.fullName ||
    gh.owner.login !== repo.owner ||
    gh.name !== repo.name;

  if (changed) {
    // If the repo moved to a different owner, re-link to that owner's installation (if any).
    const installation = await prisma.installation.findFirst({
      where: { accountLogin: gh.owner.login },
    });

    await prisma.repo.update({
      where: { id: repo.id },
      data: {
        fullName: gh.full_name,
        owner: gh.owner.login,
        name: gh.name,
        isPrivate: gh.private,
        installationId: installation?.id ?? null,
      },
    });
  }

  revalidatePath("/dashboard/repos");

  return {
    fullName: gh.full_name,
    owner: gh.owner.login,
    name: gh.name,
    changed,
  };
}

export async function connectRepo(
  githubId: number,
  fullName: string,
  owner: string,
  name: string,
  isPrivate: boolean
): Promise<
  | { ok: true; installUrl?: string }
  | { ok: false; error: string }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  const existing = await prisma.repo.findUnique({
    where: { userId_githubId: { userId: session.user.id, githubId } },
  });

  if (existing) {
    return { ok: false, error: "Repo already connected" };
  }

  const installation = await prisma.installation.findFirst({
    where: { accountLogin: owner },
  });

  await prisma.repo.create({
    data: {
      userId: session.user.id,
      githubId,
      fullName,
      owner,
      name,
      isPrivate,
      installationId: installation?.id,
    },
  });

  revalidatePath("/dashboard/repos");

  // No GitHub App installed on this owner yet — issue creation etc. won't work
  // until the user installs it, so hand the UI a link to do that now.
  if (!installation) {
    return { ok: true, installUrl: buildGithubAppInstallUrl(session.user.id) };
  }

  return { ok: true };
}
