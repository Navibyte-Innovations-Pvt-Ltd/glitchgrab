import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";
import { version } from "@/package.json";

export function PublicNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-360 items-center justify-between px-4 sm:px-6 h-14">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.25)]">
            <Image src="/logo.png" alt="" width={16} height={16} className="rounded-sm" />
          </div>
          <span className="font-mono text-sm font-bold tracking-tight text-foreground lowercase">
            glitchgrab
          </span>
          <span className="font-mono text-[10px] text-muted-foreground border border-border px-1 py-0.5 rounded-sm">
            v{version}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 h-full border-x border-border px-8">
          <Link
            href="/#how-it-works"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            /features
          </Link>
          <Link
            href="/#pipeline"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            /pipeline
          </Link>
          <Link
            href="/docs"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            /docs
          </Link>
          <a
            href="https://github.com/webnaresh/glitchgrab"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            repo
          </a>
        </div>

        <Link
          href="/#waitlist"
          className="group flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          <span className="text-border group-hover:text-primary transition-colors">[</span>
          <kbd className="font-mono text-[10px] py-0.5 px-1.5 border border-border bg-card rounded-sm">
            ⌘ K
          </kbd>
          <span className="hidden sm:inline">Join Waitlist</span>
          <span className="sm:hidden">Waitlist</span>
          <span className="text-border group-hover:text-primary transition-colors">]</span>
        </Link>
      </div>
    </nav>
  );
}
