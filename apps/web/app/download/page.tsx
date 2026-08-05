import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public-nav";
import { Footer } from "@/components/footer";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import {
  getLatestGlitchRecordRelease,
  GLITCHRECORD_RELEASES_URL,
} from "@/lib/glitchrecord-release";
import { DownloadPicker } from "./download-picker";
import { ChevronsRight, Github, Bug, Video, ShieldCheck } from "lucide-react";

const PAGE_URL = "https://glitchgrab.dev/download";
const PAGE_TITLE = "Download GlitchRecord — Glitchgrab";
const PAGE_DESC =
  "Download the GlitchRecord desktop app for Mac, Windows, or Linux. Record your screen, report bugs from any browser, and file GitHub issues automatically.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  keywords: [
    "download glitchrecord",
    "screen recorder download",
    "bug reporting app",
    "qa tester tool",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESC, url: PAGE_URL, type: "website" },
};

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Sign in",
    body: "Testers: open the QA link your team sent you in any browser, then press “Open in GlitchRecord”. Everyone else: press Connect Glitchgrab in the app.",
  },
  {
    icon: Bug,
    title: "Report a bug",
    body: "Press Report Bug. It screenshots your whole screen — any browser, any app — then you describe the problem and pick a repo. A GitHub issue is filed under your name.",
  },
  {
    icon: Video,
    title: "Or record it",
    body: "Press New Recording to capture a walkthrough. GlitchRecord turns it into a narrated tutorial and can open an issue from what you did.",
  },
];

export default async function DownloadPage() {
  const release = await getLatestGlitchRecordRelease();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://glitchgrab.dev" },
          { name: "Download", url: PAGE_URL },
        ]}
      />
      <PublicNav />

      <main className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6">
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <ChevronsRight className="h-3 w-3 text-primary" />
          Desktop app
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Download GlitchRecord
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Report bugs and record walkthroughs from your desktop — works with{" "}
          <span className="text-foreground">any browser</span> (Chrome, Firefox,
          Safari, Edge) and any native app. Free and open source.
        </p>

        <div className="mt-8">
          {release ? (
            <DownloadPicker assets={release.assets} version={release.version} />
          ) : (
            /* No published release yet, or GitHub was unreachable. Say so
               plainly instead of rendering buttons that 404. */
            <div className="rounded-lg border border-border bg-muted/20 p-6">
              <h2 className="text-sm font-semibold">Builds are on the way</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                No desktop release has been published yet. Check the{" "}
                <a
                  href={GLITCHRECORD_RELEASES_URL}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  releases page
                </a>{" "}
                — or build from source with{" "}
                <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
                  npm run build
                </code>{" "}
                in <code className="font-mono text-xs">apps/glitchrecord</code>.
              </p>
            </div>
          )}
        </div>

        {/* First-run walkthrough */}
        <section className="mt-14">
          <h2 className="text-lg font-semibold tracking-tight">After you install it</h2>
          <div className="mt-5 space-y-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-lg border border-border bg-muted/20 p-5">
          <h2 className="text-sm font-semibold">Do I need the Chrome extension too?</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Only if you want GlitchRecord to log the exact clicks and typing
            inside Chrome tabs while recording. Reporting bugs, screenshots and
            screen recording all work without it — which is why testers who use
            Firefox, Safari or several browsers should just use the desktop app.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-4 text-xs">
          <a
            href={GLITCHRECORD_RELEASES_URL}
            className="inline-flex items-center gap-2 font-mono text-muted-foreground transition-colors hover:text-primary"
          >
            <Github className="h-3.5 w-3.5" />
            All releases &amp; changelog
          </a>
          <Link
            href="/features"
            className="font-mono text-muted-foreground transition-colors hover:text-primary"
          >
            /features
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
