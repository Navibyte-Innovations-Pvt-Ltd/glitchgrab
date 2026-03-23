import { prisma } from "@/lib/db";

export interface UserPlan {
  plan: "FREE" | "PRO_BYOK" | "PRO_PLATFORM";
  isActive: boolean;
  maxRepos: number;
  maxIssuesPerMonth: number;
  hasAiAccess: boolean;
  expiresAt: Date | null;
}

const FREE_LIMITS = {
  maxRepos: 1,
  maxIssuesPerMonth: 30,
  hasAiAccess: false,
};

const PRO_LIMITS = {
  maxRepos: Infinity,
  maxIssuesPerMonth: Infinity,
  hasAiAccess: true,
};

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || subscription.plan === "FREE") {
    return {
      plan: "FREE",
      isActive: true,
      ...FREE_LIMITS,
      expiresAt: null,
    };
  }

  // Check if subscription is expired
  const isExpired =
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd < new Date();

  if (isExpired || subscription.status !== "ACTIVE") {
    return {
      plan: "FREE",
      isActive: false,
      ...FREE_LIMITS,
      expiresAt: subscription.currentPeriodEnd,
    };
  }

  return {
    plan: subscription.plan as UserPlan["plan"],
    isActive: true,
    ...PRO_LIMITS,
    expiresAt: subscription.currentPeriodEnd,
  };
}

export async function checkRepoLimit(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  if (plan.maxRepos === Infinity) return true;
  const repoCount = await prisma.repo.count({ where: { userId } });
  return repoCount < plan.maxRepos;
}

export async function checkIssueLimit(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  if (plan.maxIssuesPerMonth === Infinity) return true;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const issueCount = await prisma.issue.count({
    where: {
      repo: { userId },
      createdAt: { gte: startOfMonth },
    },
  });

  return issueCount < plan.maxIssuesPerMonth;
}
