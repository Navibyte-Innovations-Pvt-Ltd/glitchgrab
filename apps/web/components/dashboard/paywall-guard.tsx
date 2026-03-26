import { auth } from "@/lib/auth";
import { getTrialStatus } from "@/lib/billing";
import { PaywallBlock } from "./paywall-block";
import { TrialBanner } from "./trial-banner";
import { WelcomeTrialDialog } from "./welcome-trial-dialog";

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

  const showWelcome = trial.inTrial && !trial.hasActiveSubscription;

  return (
    <>
      {showWelcome && (
        <WelcomeTrialDialog
          email={session.user?.email ?? ""}
          name={session.user?.name ?? ""}
          daysLeft={trial.daysLeft}
        />
      )}
      {children}
    </>
  );
}
