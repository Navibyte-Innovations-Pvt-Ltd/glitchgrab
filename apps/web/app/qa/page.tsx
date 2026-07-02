export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getTesterSession } from "@/lib/tester-session";
import { getQaView } from "@/lib/qa-view";
import { QaClient } from "./qa-client";
import { QaLogin } from "./qa-login";

export const metadata: Metadata = {
  title: "QA Verification",
  robots: { index: false, follow: false },
};

export default async function QaPage() {
  const testerId = await getTesterSession();
  const view = testerId ? await getQaView(testerId) : null;

  if (!view) return <QaLogin />;

  return (
    <QaClient
      testerName={view.testerName}
      orgName={view.orgName}
      checks={view.checks}
      showLogout
    />
  );
}
