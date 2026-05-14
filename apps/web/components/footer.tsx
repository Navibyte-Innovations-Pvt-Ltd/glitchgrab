import Image from "next/image";
import Link from "next/link";
import { Github, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background border-b-[6px] border-b-primary pt-16 pb-8">
      <div className="max-w-360 mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 font-mono text-xs border-x border-border/50">
        <div className="col-span-2 flex flex-col justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5 text-foreground font-bold text-sm mb-3">
              <div className="w-7 h-7 rounded bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                <Image src="/logo.png" alt="Glitchgrab" width={18} height={18} className="rounded-sm" />
              </div>
              <span className="font-mono lowercase tracking-tight">glitchgrab</span>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-xs">
              Autonomous issue generation for high-velocity engineering teams.
              Stop triage, start shipping.
            </p>
          </div>
          <div className="text-muted-foreground/70 text-[10px] leading-relaxed">
            © {new Date().getFullYear()} Navibyte Innovation Pvt. Ltd.
            <br />
            SYS.STATUS: ALL SYSTEMS NOMINAL
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-foreground uppercase tracking-widest border-b border-border pb-2">
            Product
          </span>
          <ul className="space-y-2.5">
            <li>
              <Link href="/docs" className="text-muted-foreground hover:text-primary transition-colors">
                Docs
              </Link>
            </li>
            <li>
              <a href="/#how-it-works" className="text-muted-foreground hover:text-primary transition-colors">
                How it works
              </a>
            </li>
            <li>
              <Link href="/changelog" className="text-muted-foreground hover:text-primary transition-colors">
                Changelog
              </Link>
            </li>
            <li>
              <a href="/#waitlist" className="text-muted-foreground hover:text-primary transition-colors">
                Join Waitlist
              </a>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-foreground uppercase tracking-widest border-b border-border pb-2">
            Resources
          </span>
          <ul className="space-y-2.5">
            <li>
              <a
                href="https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Github className="h-3 w-3" /> GitHub
              </a>
            </li>
            <li>
              <a
                href="https://www.npmjs.com/package/glitchgrab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                npm Package
              </a>
            </li>
            <li>
              <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <span className="text-foreground uppercase tracking-widest border-b border-border pb-2">
            Legal
          </span>
          <ul className="space-y-2.5">
            <li>
              <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/refund" className="text-muted-foreground hover:text-primary transition-colors">
                Refund
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-360 mx-auto mt-10 px-4 sm:px-6 border-x border-border/50 pt-6 border-t">
        <p className="font-mono text-[10px] text-muted-foreground/70 text-center">
          Open source under{" "}
          <a
            href="https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            MIT License
          </a>
          <span className="mx-2">·</span>
          <ArrowRight className="inline h-3 w-3 align-middle" /> built for devs
        </p>
      </div>
    </footer>
  );
}
