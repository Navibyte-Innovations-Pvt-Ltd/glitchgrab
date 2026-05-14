export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrgContext } from "./lib/get-org-context";
import { OrgOverview } from "./org-overview";

export default async function OrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);

  if (ctx.role === "MEMBER") redirect(`/org/${slug}/chat`);

  return <OrgOverview ctx={ctx} />;
}
