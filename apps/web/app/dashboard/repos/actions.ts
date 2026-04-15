"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const WEBHOOK_URL = process.env.NEXTAUTH_URL
  ? `${process.env.NEXTAUTH_URL}/api/v1/github/webhook`
  : "https://glitchgrab.dev/api/v1/github/webhook";

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
  });
  if (!repo) throw new Error("Repo not found");

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
  });
  if (!account?.access_token) throw new Error("GitHub account not linked");

  const res = await fetch(
    `https://api.github.com/repositories/${repo.githubId}`,
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
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
    await prisma.repo.update({
      where: { id: repo.id },
      data: {
        fullName: gh.full_name,
        owner: gh.owner.login,
        name: gh.name,
        isPrivate: gh.private,
      },
    });

    // Re-setup webhook on the new location (non-blocking)
    setupGitHubWebhook(session.user.id, gh.owner.login, gh.name).catch((err) =>
      console.error("Failed to setup webhook after resync:", err)
    );
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
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const existing = await prisma.repo.findUnique({
    where: { githubId },
  });

  if (existing) {
    throw new Error("Repo already connected");
  }

  await prisma.repo.create({
    data: {
      userId: session.user.id,
      githubId,
      fullName,
      owner,
      name,
      isPrivate,
    },
  });

  // Auto-setup GitHub webhook on the repo (non-blocking)
  setupGitHubWebhook(session.user.id, owner, name).catch((err) =>
    console.error("Failed to setup GitHub webhook:", err)
  );

  revalidatePath("/dashboard/repos");
}

async function setupGitHubWebhook(userId: string, owner: string, repo: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "github" },
  });
  if (!account?.access_token) return;

  // Check if webhook already exists
  const listRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/hooks`,
    {
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (listRes.ok) {
    const hooks = (await listRes.json()) as { config: { url: string } }[];
    const alreadyExists = hooks.some((h) => h.config.url?.includes("glitchgrab"));
    if (alreadyExists) return;
  }

  // Create the webhook
  await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["issues", "issue_comment"],
      config: {
        url: WEBHOOK_URL,
        content_type: "json",
        insecure_ssl: "0",
      },
    }),
  });
}
