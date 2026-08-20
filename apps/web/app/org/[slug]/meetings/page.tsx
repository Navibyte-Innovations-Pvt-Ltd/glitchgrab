export const dynamic = "force-dynamic";

import { getOrgContext } from "../lib/get-org-context";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { MeetingsList } from "./meetings-list";
import { SendBot } from "./send-bot";
import { UpcomingCalls } from "./upcoming-calls";
import { BookingSettings } from "./booking-settings";

/**
 * Recorded client calls (#311 Phase B/C).
 *
 * Access is repo-scoped, same gate as project context — a recorded client
 * conversation is the most sensitive thing in the product, so org membership
 * alone shows nothing.
 */
export default async function OrgMeetingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getOrgContext(slug);

  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="calls"
        subtitle="Recorded client calls, transcribed"
        meta="audio only · stored private · repo-scoped access"
      />
      <UpcomingCalls />
      <BookingSettings />
      <SendBot />
      <MeetingsList orgSlug={ctx.orgSlug} />
    </div>
  );
}
