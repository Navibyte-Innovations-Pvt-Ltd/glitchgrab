import { prisma } from "@/lib/db";
import { getRazorpay } from "@/lib/razorpay";

export interface UserPlan {
  plan: "NONE" | "PRO_PLATFORM";
  isActive: boolean;
  maxRepos: number;
  maxIssuesPerMonth: number;
  requiresOwnKey: boolean;
  expiresAt: Date | null;
  razorpayStatus: string | null;
}

const NO_PLAN: Omit<UserPlan, "razorpayStatus"> = {
  plan: "NONE",
  isActive: false,
  maxRepos: 0,
  maxIssuesPerMonth: 0,
  requiresOwnKey: true,
  expiresAt: null,
};

const PRO_LIMITS = {
  maxRepos: Infinity,
  maxIssuesPerMonth: 100,
  requiresOwnKey: false,
};

export async function getUserPlan(userId: string): Promise<UserPlan> {
  if (process.env.NODE_ENV === "development") {
    return {
      plan: "PRO_PLATFORM",
      isActive: true,
      ...PRO_LIMITS,
      expiresAt: null,
      razorpayStatus: "dev-bypass",
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return { ...NO_PLAN, razorpayStatus: null };
  }

  // Fetch live status from Razorpay — single source of truth
  try {
    const razorpay = getRazorpay();
    const rzpSub = await razorpay.subscriptions.fetch(
      subscription.razorpaySubscriptionId
    );

    // Razorpay statuses: created, authenticated, active, pending, halted, cancelled, completed, expired, paused
    const status = rzpSub.status as string;
    const isActive = status === "active" || status === "authenticated";

    const expiresAt =
      rzpSub.current_end && typeof rzpSub.current_end === "number"
        ? new Date(rzpSub.current_end * 1000)
        : null;

    if (!isActive) {
      return { ...NO_PLAN, expiresAt, razorpayStatus: status };
    }

    return {
      plan: "PRO_PLATFORM",
      isActive: true,
      ...PRO_LIMITS,
      expiresAt,
      razorpayStatus: status,
    };
  } catch (error) {
    console.error("Failed to fetch Razorpay subscription:", error);
    return { ...NO_PLAN, razorpayStatus: "error" };
  }
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

export async function getTrialStatus(
  userId: string,
  /** Pass a pre-fetched plan to avoid a second Razorpay API call */
  prefetchedPlan?: UserPlan
): Promise<TrialStatus> {
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

  const plan = prefetchedPlan ?? await getUserPlan(userId);
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
