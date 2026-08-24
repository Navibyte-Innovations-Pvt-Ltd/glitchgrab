export const dynamic = "force-dynamic";

import { getOrgContext } from "../lib/get-org-context";
import { InnerPageHeader } from "@/components/dashboard/inner-page-header";
import { ExtensionsList } from "./extensions-list";

/**
 * Chrome Web Store releases (#332).
 *
 * The store tells nobody anything: a verdict lands hours after CI has exited,
 * on a console nobody has open. This page — and the WhatsApp behind it — is
 * where "it's been in review since Tuesday" stops being something you find out
 * by accident.
 */
export default async function OrgExtensionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await getOrgContext(slug);

  return (
    <div className="space-y-6">
      <InnerPageHeader
        title="extensions"
        subtitle="Chrome Web Store releases, watched"
        meta="polled every 30 min · WhatsApp on publish, rejection, or a stuck draft"
      />
      <ExtensionsList />
    </div>
  );
}
