"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/tokens";
import { revalidatePath } from "next/cache";

async function assertOrgMember(orgSlug: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: orgSlug } });
  if (!org) throw new Error("Org not found");

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: session.user.id } },
  });
  if (!member) throw new Error("Not a member of this org");

  return { orgId: org.id, userId: session.user.id };
}

export async function createOrgToken(repoId: string, name: string, orgSlug: string) {
  const { orgId } = await assertOrgMember(orgSlug);

  const repo = await prisma.repo.findFirst({ where: { id: repoId, orgId } });
  if (!repo) throw new Error("Repo not found in this org");

  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);

  await prisma.apiToken.create({
    data: { repoId: repo.id, tokenHash, name: name || "Default" },
  });

  revalidatePath(`/org/${orgSlug}/tokens`);
  return plainToken;
}

export async function deleteOrgToken(tokenId: string, orgSlug: string) {
  const { orgId } = await assertOrgMember(orgSlug);

  const token = await prisma.apiToken.findFirst({
    where: { id: tokenId, repo: { orgId } },
  });
  if (!token) throw new Error("Token not found");

  await prisma.apiToken.delete({ where: { id: tokenId } });
  revalidatePath(`/org/${orgSlug}/tokens`);
}
