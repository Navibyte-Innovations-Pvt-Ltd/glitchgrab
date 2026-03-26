"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, Sparkles } from "lucide-react";
import { UpgradeButton } from "@/app/dashboard/billing/upgrade-button";

export function WelcomeTrialDialog({
  email,
  name,
  daysLeft,
}: {
  email: string;
  name: string;
  daysLeft: number;
}) {
  return (
    <Dialog open modal>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Welcome to Glitchgrab!</DialogTitle>
          </div>
          <DialogDescription>
            Start your free 7-day trial and turn messy bugs into structured
            GitHub issues with AI.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm">
          {[
            "Unlimited repos",
            "100 AI-powered issues/mo",
            "Screenshot analysis",
            "SDK auto-capture",
            "Smart dedup & updates",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            {daysLeft} day{daysLeft === 1 ? "" : "s"} free, then
          </p>
          <p className="text-2xl font-bold text-primary">
            ₹199<span className="text-sm font-normal text-muted-foreground">/month</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Cancel anytime. No charge during trial.
          </p>
        </div>

        <DialogFooter>
          <UpgradeButton
            plan="PRO_PLATFORM"
            label="Start Free Trial"
            email={email}
            name={name}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
