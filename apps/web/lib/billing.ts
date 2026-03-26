import { prisma } from "@/lib/db";

export interface UserPlan {
  plan: "NONE" | "PRO_PLATFORM";
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

  return {
    plan: "PRO_PLATFORM",
    isActive: true,
    ...PRO_PLATFORM,
    expiresAt: subscription.currentPeriodEnd,
  };
}

// ─── Trial ────────────────────────────────────────────

const TRIAL_DAYS = 7;

export interface TrialStatus {
  inTrial: boolean;
  trialEndsAt: Date;
  daysLeft: number;
  hoursLeft: number;
  hasActiveSubscription: boolean;
  needsPaywall: boolean;
}

export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (!user) {
    return {
      inTrial: false,
      trialEndsAt: new Date(),
      daysLeft: 0,
      hoursLeft: 0,
      hasActiveSubscription: false,
      needsPaywall: true,
    };
  }

  const trialEndsAt = new Date(user.createdAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const now = new Date();
  const msLeft = trialEndsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
  const inTrial = msLeft > 0;

  const plan = await getUserPlan(userId);
  const hasActiveSubscription = plan.isActive;

  return {
    inTrial,
    trialEndsAt,
    daysLeft,
    hoursLeft,
    hasActiveSubscription,
    needsPaywall: !inTrial && !hasActiveSubscription,
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
