"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

interface AiConfigResponse {
  provider: "PLATFORM" | "OPENAI" | "ANTHROPIC";
  hasKey: boolean;
}

export async function getAiConfig(): Promise<AiConfigResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const config = await prisma.aiConfig.findUnique({
    where: { userId: session.user.id },
  });

  return {
    provider: config?.provider ?? "PLATFORM",
    hasKey: !!config?.encryptedApiKey,
  };
}

export async function updateAiConfig(
  provider: string,
  apiKey?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Validate provider
  if (!["PLATFORM", "OPENAI", "ANTHROPIC"].includes(provider)) {
    throw new Error("Invalid AI provider");
  }

  const typedProvider = provider as "PLATFORM" | "OPENAI" | "ANTHROPIC";

  // If switching to PLATFORM, clear the key
  const encryptedApiKey =
    typedProvider === "PLATFORM"
      ? null
      : apiKey
        ? encrypt(apiKey)
        : undefined;

  await prisma.aiConfig.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      provider: typedProvider,
      encryptedApiKey: encryptedApiKey ?? null,
    },
    update: {
      provider: typedProvider,
      // Only update key if a new one was provided or switching to PLATFORM
      ...(encryptedApiKey !== undefined
        ? { encryptedApiKey }
        : {}),
    },
  });
}

export async function deleteAiKey(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const config = await prisma.aiConfig.findUnique({
    where: { userId: session.user.id },
  });

  if (!config) {
    throw new Error("No AI configuration found");
  }

  await prisma.aiConfig.update({
    where: { userId: session.user.id },
    data: {
      provider: "PLATFORM",
      encryptedApiKey: null,
    },
  });
}
