export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Building2, Github, Shield, Mail, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { getOrgContext } from "../lib/get-org-context";
import { WebhookForm } from "./webhook-form";
import { WhatsappSettingsForm } from "./whatsapp-settings-form";
import { CalendarSettings } from "./calendar-settings";
import { WaPlatformsLink } from "./wa-platforms-link";

/**
 * Settings used to redirect out to /dashboard/settings, landing you in a shell
 * whose sidebar had no org slug — you could get here but not back. It renders
 * in place now.
 *
 * Two headers, because two different things live on this page. ORGANIZATION is
 * shared property: webhooks fire for the whole team. ACCOUNT is yours: your
 * profile, your WhatsApp number, your calendar. The data is still keyed to the
 * user either way — moving webhooks and the calendar onto Organization is a
 * separate change (prisma/parked/org-scoped-config.sql). The split is here now
 * so the page stops implying that your phone number belongs to the company.
 */
export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  const session = await auth();
  const user = session?.user;

  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="settings"
        subtitle={`${ctx.orgName} — integrations & account preferences`}
        meta="organization · account · webhooks"
      />

      {/* ── ORGANIZATION ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Building2 className="h-3 w-3" />
          <span>Organization</span>
        </h2>

        <div className="rounded border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-foreground truncate">
                {ctx.orgName}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">
                github.com/{slug}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary font-mono text-[10px] uppercase tracking-widest">
              <Shield className="h-3 w-3" />
              owner
            </span>
          </div>
        </div>

        <WebhookForm />
      </section>

      {/* ── NAVIBYTE ─────────────────────────────────────────────────────
          Admin-only, and deliberately its own section: a WhatsApp platform is a
          business relationship with another product, not an asset of this org.
          Filed under ORGANIZATION it would read as something the org owns. */}
      {ctx.isAdmin && (
        <section className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <Shield className="h-3 w-3" />
            <span>Navibyte admin</span>
          </h2>
          <WaPlatformsLink />
        </section>
      )}

      {/* ── ACCOUNT ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <User className="h-3 w-3" />
          <span>Account</span>
        </h2>

        <div className="rounded border border-border bg-card">
          <header className="flex items-center justify-between px-5 py-3 border-b border-border">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              profile
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
              signed in
            </span>
          </header>
          <div className="p-5">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 shrink-0 rounded border border-border">
                <AvatarImage
                  src={user?.image ?? undefined}
                  alt={user?.name ?? "User"}
                />
                <AvatarFallback className="rounded bg-muted text-base font-mono">
                  {user?.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-base font-medium text-foreground truncate">
                  {user?.name}
                </p>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-primary/40 bg-primary/5 text-primary font-mono text-[10px] uppercase tracking-widest">
                    <Shield className="h-3 w-3" />
                    <Github className="h-3 w-3" />
                    GitHub connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CalendarSettings />

        <WhatsappSettingsForm />
      </section>
    </div>
  );
}
