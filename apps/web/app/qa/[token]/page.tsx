export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getQaView } from "@/lib/qa-view";
import { QaClient } from "../qa-client";

export const metadata: Metadata = {
  title: "QA Verification",
  robots: { index: false, follow: false },
};

export default async function QaTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const tester = await prisma.tester.findUnique({ where: { magicToken: token }, select: { id: true } });
  if (!tester) notFound();

  const view = await getQaView(tester.id);
  if (!view) notFound();

  return (
    <QaClient
      token={token}
      testerName={view.testerName}
      testerEmail={view.testerEmail}
      testerPhone={view.testerPhone}
      orgName={view.orgName}
      checks={view.checks}
    />
  );
}
