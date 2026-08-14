export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrgContext } from "../lib/get-org-context";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { RateGlitchgrabLink } from "@/components/rate-glitchgrab";
import { FeedbackList } from "@/app/dashboard/feedback/feedback-list";

export default async function OrgFeedbackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);
  if (ctx.role !== "OWNER") redirect(`/org/${slug}/chat`);

  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="feedback"
        subtitle="Ratings your end-users left about your app"
        meta="owner view · publish to show them back in your app"
        action={
          <RateGlitchgrabLink
            label="Try the dialog"
            className="font-mono text-[11px] px-3 py-2 rounded border border-border hover:border-primary/50 hover:bg-muted"
          />
        }
      />
      <FeedbackList />
    </div>
  );
}
