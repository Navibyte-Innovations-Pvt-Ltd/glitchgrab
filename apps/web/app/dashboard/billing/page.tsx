export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/billing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Key, Cpu } from "lucide-react";
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
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {plan.plan === "PRO_BYOK" ? "Pro (BYOK)" : "Pro (Platform AI)"}
                  </h2>
                  <Badge>Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.plan === "PRO_BYOK"
                    ? "Unlimited repos & issues — using your own AI key"
                    : `Unlimited repos, ${plan.maxIssuesPerMonth} issues created/mo — we provide AI`}
                </p>
                {plan.expiresAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Renews {plan.expiresAt.toLocaleDateString()}
                  </p>
                )}
              </div>
              <CheckCircle className="h-8 w-8 text-primary shrink-0" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Selection */}
      {!plan.isActive && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* BYOK */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Pro (BYOK)</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold">$5</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Bring your own OpenAI or Claude key
              </p>
              <ul className="space-y-2 text-sm mb-6">
                {[
                  "Unlimited repos",
                  "Unlimited issues",
                  "Smart dedup & updates",
                  "Screenshot analysis",
                  "SDK auto-capture",
                  "You provide your AI key",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <UpgradeButton
                plan="PRO_BYOK"
                label="Get Pro (BYOK) — $5/mo"
                email={session?.user?.email ?? ""}
                name={session?.user?.name ?? ""}
              />
            </CardContent>
          </Card>

          {/* Platform */}
          <Card className="border-2 border-primary overflow-visible relative">
            <CardContent className="p-6 pt-8">
              <Badge className="absolute -top-2.5 left-4 sm:left-auto sm:right-4 z-10">Recommended</Badge>
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Pro (Platform AI)</h3>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-primary">$10</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                We provide AI — zero setup
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
                label="Get Pro (Platform) — $10/mo"
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
