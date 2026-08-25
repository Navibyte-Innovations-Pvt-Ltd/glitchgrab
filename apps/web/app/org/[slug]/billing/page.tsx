export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrgContext } from "../lib/get-org-context";
import { BillingView } from "./billing-view";

/**
 * Billing used to redirect out to /dashboard/billing, which dropped you into a
 * different shell whose sidebar had no org slug in it — the fastest way to get
 * lost in the app. It renders in place now.
 */
export default async function OrgBillingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  return <BillingView />;
}
