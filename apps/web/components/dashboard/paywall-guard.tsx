import { auth } from "@/lib/auth";
import { getTrialStatus } from "@/lib/billing";
import { PaywallBlock } from "./paywall-block";
import { TrialBanner } from "./trial-banner";

export async function PaywallGuard({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const trial = await getTrialStatus(userId);

  if (trial.needsPaywall) {
    return (
      <PaywallBlock
        email={session.user?.email ?? ""}
        name={session.user?.name ?? ""}
      />
    );
  }

  return (
    <>
      {trial.inTrial && !trial.hasActiveSubscription && (
        <TrialBanner
          daysLeft={trial.daysLeft}
          hoursLeft={trial.hoursLeft}
          email={session.user?.email ?? ""}
          name={session.user?.name ?? ""}
        />
      )}
      {children}
    </>
  );
}
