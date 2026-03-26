export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/billing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Cpu } from "lucide-react";
import { UpgradeButton } from "./upgrade-button";

export default async function BillingPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const plan = await getUserPlan(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Choose your plan to start capturing bugs
        </p>
      </div>

      {/* Current Plan */}
      {plan.isActive && (
        <Card className="border-primary/30">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-semibold">
                    Glitchgrab Pro
                  </h2>
                  <Badge>Active</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Unlimited repos, {plan.maxIssuesPerMonth} issues created/mo — AI-powered
                </p>
                {plan.expiresAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Renews {plan.expiresAt.toLocaleDateString()}
                  </p>
                )}
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Selection */}
      {!plan.isActive && (
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-primary overflow-visible relative">
            <CardContent className="p-4 pt-8 sm:p-6 sm:pt-8">
              <Badge className="absolute -top-2.5 left-4 sm:left-auto sm:right-4 z-10">Pro</Badge>
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Glitchgrab Pro</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-primary">₹199</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                AI-powered bug capture — zero setup
              </p>
              <ul className="space-y-2 text-sm mb-6">
                {[
                  "Unlimited repos",
                  "100 issues created/mo",
                  "Smart dedup & updates (free)",
                  "Screenshot analysis",
                  "SDK auto-capture",
                  "No API key needed",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <UpgradeButton
                plan="PRO_PLATFORM"
                label="Get Pro — ₹199/mo"
                email={session?.user?.email ?? ""}
                name={session?.user?.name ?? ""}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
