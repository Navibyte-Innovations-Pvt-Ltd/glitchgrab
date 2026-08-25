import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTesterSession } from "@/lib/tester-session";
import { TesterShell } from "@/components/dashboard/tester-shell";

/**
 * /dashboard is the QA tester surface, and nothing else.
 *
 * It used to be the owner surface too, duplicating every page that now lives
 * under /org/<slug>/*. Those duplicates are gone: an owner arriving here is
 * redirected into their org (proxy.ts does this on the fast path; the lookup
 * below catches sessions minted before orgSlug was cached in the JWT), and an
 * owner with no org is sent to build one, because an org is required to use
 * the product.
 *
 * What is left renders only for a tester — who is not a NextAuth user at all,
 * but carries the gg_tester cookie — so none of the owner queries can run for
 * them and there is no owner data here to leak by accident.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    const testerId = await getTesterSession();
    const tester = testerId
      ? await prisma.tester.findUnique({
          where: { id: testerId },
          select: { name: true, org: { select: { name: true } } },
        })
      : null;

    if (tester) {
      return (
        <TesterShell name={tester.name} orgName={tester.org.name}>
          {children}
        </TesterShell>
      );
    }

    redirect("/login");
  }

  const membership = session.user.id
    ? await prisma.orgMember.findFirst({
        where: { userId: session.user.id },
        select: { role: true, org: { select: { githubOrgLogin: true } } },
      })
    : null;

  if (!membership) redirect("/org/setup");

  // The sub-path is deliberately dropped here. proxy.ts already maps
  // /dashboard/x → /org/<slug>/x for every path it sees; this fallback only
  // catches the bare root and stale sessions, and every owner page below
  // /dashboard has been deleted, so there is no sub-path left worth carrying.
  //
  // A MEMBER has no overview — the org root is an owner page — so they go
  // straight to chat, the same rule the old dashboard page applied.
  const slug = membership.org.githubOrgLogin;
  redirect(membership.role === "MEMBER" ? `/org/${slug}/chat` : `/org/${slug}`);
}
