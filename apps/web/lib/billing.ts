import { prisma } from "@/lib/db";

export interface UserPlan {
  plan: "NONE" | "PRO_BYOK" | "PRO_PLATFORM";
  isActive: boolean;
  maxRepos: number;
  maxIssuesPerMonth: number;
  requiresOwnKey: boolean;
  expiresAt: Date | null;
}

const NO_PLAN = {
  maxRepos: 0,
  maxIssuesPerMonth: 0,
  requiresOwnKey: true,
};

const PRO_BYOK = {
  maxRepos: Infinity,
  maxIssuesPerMonth: Infinity,
  requiresOwnKey: true,
};

const PRO_PLATFORM = {
  maxRepos: Infinity,
  maxIssuesPerMonth: 100,
  requiresOwnKey: false,
};

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  // No subscription — no access
  if (!subscription || subscription.plan === "FREE") {
    return {
      plan: "NONE",
      isActive: false,
      ...NO_PLAN,
      expiresAt: null,
    };
  }

  // Check if expired
  const isExpired =
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd < new Date();

  if (isExpired || subscription.status !== "ACTIVE") {
    return {
      plan: "NONE",
      isActive: false,
      ...NO_PLAN,
      expiresAt: subscription.currentPeriodEnd,
    };
  }

  if (subscription.plan === "PRO_PLATFORM") {
    return {
      plan: "PRO_PLATFORM",
      isActive: true,
      ...PRO_PLATFORM,
      expiresAt: subscription.currentPeriodEnd,
    };
  }

  return {
    plan: "PRO_BYOK",
    isActive: true,
    ...PRO_BYOK,
    expiresAt: subscription.currentPeriodEnd,
  };
}

export async function checkIssueLimit(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  if (!plan.isActive) return false;
  if (plan.maxIssuesPerMonth === Infinity) return true;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Only count created issues, not updates/closes
  const issueCount = await prisma.issue.count({
    where: {
      repo: { userId },
      createdAt: { gte: startOfMonth },
    },
  });

  return issueCount < plan.maxIssuesPerMonth;
}
