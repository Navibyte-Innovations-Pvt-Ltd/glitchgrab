import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { RateGlitchgrabLink } from "@/components/rate-glitchgrab";
import { FeedbackList } from "./feedback-list";

export default async function FeedbackPage() {
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
