import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";

/**
 * Entry point to the WhatsApp platform admin.
 *
 * A link rather than the panel itself: a `WaPlatform` has no org, so embedding
 * it inside an org's settings would imply a relationship that does not exist.
 * It sits here because Settings is where config already lives and the sidebar
 * has no room — 15 items exactly fill it, and a 16th lands behind the user
 * footer.
 *
 * Rendered only for ADMIN_EMAILS; the page re-checks server-side, so this is
 * discoverability, not access control.
 */
export function WaPlatformsLink() {
  return (
    <Link
      href="/admin/whatsapp-platforms"
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"
    >
      <div className="rounded-full bg-emerald-500/10 p-2">
        <MessageCircle className="h-4 w-4 text-emerald-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">WhatsApp platforms</p>
        <p className="text-xs text-muted-foreground">
          Products reselling our WhatsApp infra — keys, prices, wallets, tenants
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
