export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getTesterSession } from "@/lib/tester-session";
import { getQaView } from "@/lib/qa-view";
import { QaClient } from "@/app/qa/qa-client";

/**
 * Tester home.
 *
 * A tester has no NextAuth session — they sign in with a phone OTP and carry
 * the gg_tester cookie — and /dashboard is the ONLY page they can reach, since
 * proxy.ts bounces every sub-path back here. That is the point: no more
 * /qa/<token> link living outside the product.
 *
 * Owners never get this far. The layout redirects them into their org (or to
 * /org/setup if they have none) before this renders, which is why the owner
 * overview that used to live here is gone — /org/<slug> is the real one.
 */
export default async function DashboardPage() {
  const testerId = await getTesterSession();
  const view = testerId ? await getQaView(testerId) : null;

  if (!view) redirect("/login");

  return (
    <QaClient
      testerName={view.testerName}
      testerEmail={view.testerEmail}
      testerPhone={view.testerPhone}
      orgName={view.orgName}
      checks={view.checks}
      embedded
    />
  );
}
