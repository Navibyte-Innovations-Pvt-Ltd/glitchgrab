"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const WEBHOOK_URL = process.env.NEXTAUTH_URL
  ? `${process.env.NEXTAUTH_URL}/api/v1/github/webhook`
  : "https://glitchgrab.dev/api/v1/github/webhook";

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
