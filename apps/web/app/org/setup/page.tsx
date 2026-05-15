export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { OrgSetupClient } from "./org-setup-client";

export default async function OrgSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // If already in an org, redirect there
  const existing = await prisma.orgMember.findFirst({
    where: { userId: session.user.id },
    include: { org: true },
  });
  if (existing) redirect(`/org/${existing.org.githubOrgLogin}`);

  return <OrgSetupClient />;
}
