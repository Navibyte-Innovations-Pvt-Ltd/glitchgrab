import { PublicNav } from "@/components/public-nav";
import { Footer } from "@/components/footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 pt-24 pb-10 sm:px-6 sm:pb-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
