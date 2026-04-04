-- Simplify Subscription model: Razorpay is the single source of truth for status.
-- Only store the razorpaySubscriptionId; fetch status live from Razorpay API.

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "cancelledAt",
DROP COLUMN "currentPeriodEnd",
DROP COLUMN "currentPeriodStart",
DROP COLUMN "plan",
DROP COLUMN "razorpayCustomerId",
DROP COLUMN "status",
ALTER COLUMN "razorpaySubscriptionId" SET NOT NULL;

-- DropEnum
DROP TYPE "Plan";

-- DropEnum
DROP TYPE "SubscriptionStatus";
