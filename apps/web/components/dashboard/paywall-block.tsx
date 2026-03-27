"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ShieldAlert } from "lucide-react";
import { UpgradeButton } from "@/app/dashboard/billing/upgrade-button";

const FEATURES = [
  "Unlimited repos",
  "100 issues created/mo",
  "Smart dedup & updates",
  "Screenshot analysis",
  "SDK auto-capture",
  "AI built in — zero setup",
];

export function PaywallBlock({ email, name }: { email: string; name: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="flex flex-col items-center text-center mb-8 max-w-md">
        <div className="flex items-center justify-center h-14 w-14 rounded-full bg-destructive/10 mb-4">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your free trial has ended</h1>
        <p className="text-muted-foreground text-sm">
          Subscribe to continue using Glitchgrab. Your data is safe — pick up
          right where you left off.
        </p>
      </div>

      <div className="max-w-md w-full">
        <Card className="border-2 border-primary overflow-visible relative pt-0">
          <CardContent className="p-4 pt-8 sm:p-6 sm:pt-8">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-primary">
                &#8377;199
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              AI-powered bug capture — zero setup
            </p>
            <ul className="space-y-2 text-sm mb-6">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <UpgradeButton
              plan="PRO_PLATFORM"
              label="Get Pro — ₹199/mo"
              email={email}
              name={name}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
