"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Key, Cpu, ShieldAlert } from "lucide-react";
import { UpgradeButton } from "@/app/dashboard/billing/upgrade-button";

const BYOK_FEATURES = [
  "Unlimited repos",
  "Unlimited issues",
  "Smart dedup & updates",
  "Screenshot analysis",
  "SDK auto-capture",
  "You provide your AI key",
];

const PLATFORM_FEATURES = [
  "Unlimited repos",
  "100 issues created/mo",
  "Smart dedup & updates (free)",
  "Screenshot analysis",
  "SDK auto-capture",
  "No API key needed",
];

export function PaywallBlock({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="flex flex-col items-center text-center mb-8 max-w-md">
        <div className="flex items-center justify-center h-14 w-14 rounded-full bg-destructive/10 mb-4">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your free trial has ended</h1>
        <p className="text-muted-foreground text-sm">
          Choose a plan to continue using Glitchgrab. Your data is safe — pick
          up right where you left off.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 w-full max-w-2xl">
        {/* BYOK */}
        <Card>
          <CardContent className="p-4 sm:p-6">
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
              {BYOK_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <UpgradeButton
              plan="PRO_BYOK"
              label="Get Pro (BYOK) — $5/mo"
              email={email}
              name={name}
            />
          </CardContent>
        </Card>

        {/* Platform */}
        <Card className="border-2 border-primary overflow-visible relative">
          <CardContent className="p-4 pt-8 sm:p-6 sm:pt-8">
            <Badge className="absolute -top-2.5 left-4 sm:left-auto sm:right-4 z-10">
              Recommended
            </Badge>
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
              {PLATFORM_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <UpgradeButton
              plan="PRO_PLATFORM"
              label="Get Pro (Platform) — $10/mo"
              email={email}
              name={name}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
