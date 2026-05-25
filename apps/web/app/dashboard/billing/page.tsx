export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/billing";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import {
  CheckCircle2,
  Crown,
  Clock,
  AlertTriangle,
  Zap,
  Users,
  Shield,
} from "lucide-react";
import { UpgradeButton } from "./upgrade-button";
import { CancelButton } from "./cancel-button";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMonthYear(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function BillingPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const plan = await getUserPlan(userId);

  const isCancelled = plan.razorpayStatus === "cancelled";

  const subtitle = plan.isActive
    ? `Glitchgrab Pro · \u20B9199/mo · ${
        isCancelled ? "Cancelled" : "Active"
      }${plan.expiresAt ? ` until ${formatMonthYear(plan.expiresAt)}` : ""}`
    : "No active subscription · Free tier · Upgrade to unlock AI capture";

  const meta = plan.isActive
    ? isCancelled
      ? "Status: winding down"
      : "Status: operational"
    : "Status: free tier";

  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="billing"
        subtitle={subtitle}
        meta={meta}
      />

      {/* Active plan view */}
      {plan.isActive && (
        <div className="space-y-6">
          {/* PLAN section */}
          <section className="space-y-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Crown className="h-3 w-3" />
              <span>Plan</span>
            </h2>
            <div className="rounded border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-base font-medium text-foreground">
                      Glitchgrab Pro
                    </h3>
                    {isCancelled ? (
                      <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        Cancelled
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Unlimited repos · {plan.maxIssuesPerMonth} issues/mo · AI-powered
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono tabular-nums text-2xl text-foreground leading-none">
                    &#8377;199
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                    per month
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* USAGE section */}
          <section className="space-y-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Usage &amp; Renewal</span>
            </h2>
            <div className="rounded border border-border bg-card divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-foreground">Monthly issue quota</span>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    AI-generated GitHub issues
                  </span>
                </div>
                <span className="font-mono tabular-nums text-sm text-foreground">
                  {plan.maxIssuesPerMonth}
                </span>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-foreground">
                    {isCancelled ? "Access ends" : "Next renewal"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    {isCancelled
                      ? "No further charges"
                      : "Auto-renews via Razorpay"}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-sm text-foreground">
                  {plan.expiresAt
                    ? plan.expiresAt.toLocaleDateString("en-US")
                    : "\u2014"}
                </span>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-foreground">Billing status</span>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    Razorpay subscription state
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground">
                  {plan.razorpayStatus ?? "unknown"}
                </span>
              </div>
            </div>
          </section>

          {/* DANGER ZONE — only when not already cancelled */}
          {!isCancelled && (
            <section className="space-y-3">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                <span>Danger Zone</span>
              </h2>
              <div className="rounded border border-red-500/30 bg-red-500/5 p-5">
                <p className="text-sm text-foreground mb-1">
                  Cancel subscription
                </p>
                <p className="font-mono text-[11px] text-muted-foreground mb-4 leading-relaxed">
                  Your Pro access continues until the end of the current billing
                  period. After that, AI capture and new issue creation will be
                  disabled. This cannot be undone via the dashboard.
                </p>
                <CancelButton expiresAt={plan.expiresAt} />
              </div>
            </section>
          )}

          {isCancelled && (
            <section className="space-y-3">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                <span>Notice</span>
              </h2>
              <div className="rounded border border-red-500/30 bg-red-500/5 p-5">
                <p className="font-mono text-[11px] text-red-400 leading-relaxed">
                  Subscription cancelled. You retain Pro access until
                  {plan.expiresAt
                    ? ` ${plan.expiresAt.toLocaleDateString("en-US")}`
                    : " the end of your billing period"}
                  .
                </p>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Upgrade / free tier view */}
      {!plan.isActive && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Crown className="h-3 w-3" />
              <span>Plan</span>
            </h2>

            <div className="rounded border border-primary/40 bg-card overflow-hidden">
              {/* header strip */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                    Recommended
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  GG_PRO
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      Glitchgrab Pro
                    </h3>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      AI-powered bug capture · zero setup
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="font-mono tabular-nums text-3xl sm:text-4xl text-foreground leading-none">
                        &#8377;199
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                      /mo
                    </div>
                  </div>
                </div>

                <ul className="grid gap-2.5 mb-6">
                  {[
                    { label: "Unlimited repos", Icon: Users },
                    { label: "100 issues created / month", Icon: Zap },
                    { label: "Smart dedup & updates (free)", Icon: Shield },
                    { label: "Screenshot analysis", Icon: CheckCircle2 },
                    { label: "SDK auto-capture", Icon: CheckCircle2 },
                    { label: "AI built in — zero setup", Icon: CheckCircle2 },
                  ].map(({ label, Icon }) => (
                    <li
                      key={label}
                      className="flex items-center gap-2.5 text-sm text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-mono text-[12px]">{label}</span>
                    </li>
                  ))}
                </ul>

                <UpgradeButton
                  plan="PRO_PLATFORM"
                  label="Upgrade to Pro"
                  email={session?.user?.email ?? ""}
                  name={session?.user?.name ?? ""}
                />

                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-3 text-center">
                  Secured by Razorpay · Cancel anytime
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
