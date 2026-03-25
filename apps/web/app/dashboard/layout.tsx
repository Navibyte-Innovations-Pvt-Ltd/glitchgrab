import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
// TODO: Re-enable PaywallGuard once Razorpay International is activated
// import { PaywallGuard } from "@/components/dashboard/paywall-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  return (
    <div className="flex h-(--app-height,100vh) bg-background transition-[height] duration-100">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {/* TODO: Re-enable once Razorpay International is activated */}
          {/* <PaywallGuard>{children}</PaywallGuard> */}
          {children}
        </main>
        <BottomNav user={user} />
      </div>
    </div>
  );
}
