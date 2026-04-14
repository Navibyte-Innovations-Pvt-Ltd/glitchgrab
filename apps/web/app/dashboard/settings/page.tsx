export const dynamic = "force-dynamic";

import { Settings as SettingsIcon, Github, Shield, Mail, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { WebhookForm } from "./webhook-form";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="space-y-6">
      <InnerPageHeader
        segment="settings"
        icon={SettingsIcon}
        title="settings"
        subtitle="Your account & integration preferences"
        meta="account · webhooks · danger zone"
      />

      {/* ACCOUNT */}
      <section className="rounded border border-border bg-card">
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <User className="h-3 w-3" />
            ACCOUNT
          </h2>
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
              <div className="flex items-center gap-2">
                <p className="text-base font-medium text-foreground truncate">
                  {user?.name}
                </p>
              </div>
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
      </section>

      <WebhookForm />
    </div>
  );
}
