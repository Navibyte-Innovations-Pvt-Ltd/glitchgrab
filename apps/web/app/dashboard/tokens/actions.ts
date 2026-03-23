"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/tokens";
import { revalidatePath } from "next/cache";

export async function createToken(repoId: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const repo = await prisma.repo.findFirst({
    where: { id: repoId, userId: session.user.id },
  });
  if (!repo) throw new Error("Repo not found");

  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);

  await prisma.apiToken.create({
    data: {
      repoId: repo.id,
      tokenHash,
      name: name || "Default",
    },
  });

  revalidatePath("/dashboard/tokens");

  // Return plaintext token — shown ONCE to the user
  return plainToken;
}

export async function deleteToken(tokenId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const token = await prisma.apiToken.findFirst({
    where: { id: tokenId, repo: { userId: session.user.id } },
  });
  if (!token) throw new Error("Token not found");

  await prisma.apiToken.delete({ where: { id: tokenId } });
  revalidatePath("/dashboard/tokens");
}
