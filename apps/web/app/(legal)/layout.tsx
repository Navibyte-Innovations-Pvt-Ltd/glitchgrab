import Image from "next/image";
import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo.png"
              alt="Glitchgrab"
              width={24}
              height={24}
              className="rounded-full"
            />
            <span className="text-sm font-medium group-hover:text-primary transition">
              glitchgrab
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary transition"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        {children}
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Navibyte Innovation Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
