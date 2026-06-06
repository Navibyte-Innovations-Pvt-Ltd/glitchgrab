import { getOrgContext } from "./lib/get-org-context";
import { OrgSidebar } from "./org-sidebar";
import { OrgBottomNav } from "./org-bottom-nav";
import { PhonePromptDialog } from "@/components/dashboard/phone-prompt-dialog";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [ctx, session] = await Promise.all([getOrgContext(slug), auth()]);
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { whatsappPhone: true },
      })
    : null;

  return (
    <div className="flex h-(--app-height,100vh) bg-background transition-[height] duration-100">
      <OrgSidebar ctx={ctx} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <OrgBottomNav ctx={ctx} />
      <PhonePromptDialog hasPhone={!!dbUser?.whatsappPhone} />
    </div>
  );
}
