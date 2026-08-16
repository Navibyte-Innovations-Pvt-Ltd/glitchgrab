export const dynamic = "force-dynamic";

import { getOrgContext } from "../../lib/get-org-context";
import { MeetingDetail } from "./meeting-detail";

export default async function OrgMeetingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ctx = await getOrgContext(slug);

  return <MeetingDetail meetingId={id} orgSlug={ctx.orgSlug} />;
}
