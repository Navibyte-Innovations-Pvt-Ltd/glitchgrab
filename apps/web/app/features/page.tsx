import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public-nav";
import { Footer } from "@/components/footer";
import {
  CheckCircle2,
  ChevronsRight,
  Zap,
  MessageSquare,
  Scan,
  Video,
  MessageCircle,
  Cpu,
  Smartphone,
  BarChart3,
  Search,
  GitFork,
  ScanSearch,
  Terminal,
} from "lucide-react";

const PAGE_URL = "https://glitchgrab.dev/features";
const PAGE_TITLE = "Features — Glitchgrab";
const PAGE_DESC =
  "Everything in Glitchgrab: SDK auto-capture, report button, dashboard chat, GlitchRecord screen recording, WhatsApp alerts, MCP server, mobile app, analytics, and SEO — all in one platform.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  keywords: [
    "glitchgrab features",
    "bug tracking features",
    "github issue automation",
    "screen recording bug report",
    "whatsapp bug alert",
    "nextjs sdk auto-capture",
    "developer tools features",
    "ai bug tracker",
    "chrome extension bug capture",
    "mcp server github issues",
    "mobile bug reporting app",
    "issue velocity analytics",
    "seo management developer tool",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    title: PAGE_TITLE,
    description: PAGE_DESC,
    images: [{ url: "https://glitchgrab.dev/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESC,
    images: ["https://glitchgrab.dev/og-image.png"],
  },
  other: {
    "geo.region": "IN",
    "geo.placename": "India",
  },
};

const FEATURES_GRID = [
  {
    icon: Zap,
    label: "sdk auto-capture",
    title: "Unhandled errors → GitHub issues",
    desc: "Drop in 3 lines. Every unhandled exception in production is captured, deduped, and filed as a structured GitHub issue — automatically.",
  },
  {
    icon: Scan,
    label: "report button",
    title: "One click from your app",
    desc: "Users hit the floating report button (or ⌘ Shift G) and Glitchgrab captures a screenshot and creates the issue. No copy-pasting, no Slack messages.",
  },
  {
    icon: MessageSquare,
    label: "dashboard chat",
    title: "Describe it, we file it",
    desc: "Paste a screenshot or type what's broken into the dashboard chat. Glitchgrab turns it into a structured GitHub issue in seconds.",
  },
  {
    icon: Video,
    label: "glitchrecord",
    title: "Screen recording → issue",
    desc: "Record your screen, capture every click, type, and scroll. Glitchgrab generates a narrated tutorial and auto-creates the GitHub issue from the session.",
  },
  {
    icon: MessageCircle,
    label: "whatsapp alerts",
    title: "Real-time WhatsApp notifications",
    desc: "Get notified on WhatsApp when issues are assigned or resolved. Reporters confirm fixes with one tap — no app required.",
  },
  {
    icon: Cpu,
    label: "mcp server",
    title: "Works inside Claude Desktop",
    desc: "Connect Glitchgrab directly to Claude Desktop via the MCP server. File issues without leaving your AI workflow.",
  },
  {
    icon: Smartphone,
    label: "mobile app",
    title: "Full dashboard on iOS & Android",
    desc: "The same dashboard, native feel. Share screenshots from other apps directly into Glitchgrab and create issues instantly.",
  },
  {
    icon: BarChart3,
    label: "analytics",
    title: "Issue velocity & team health",
    desc: "See issues closed per day, team velocity, and best performance days — across every repo and org member. Spot slowdowns early.",
  },
  {
    icon: Search,
    label: "seo + gsc",
    title: "SEO for all your domains",
    desc: "Manage meta tags, sitemaps, and structured data across all projects. Connect Google Search Console and reindex pages with one click.",
  },
];

function ImagePlaceholder({ path, label }: { path: string; label: string }) {
  return (
    <div className="w-full aspect-[16/9] border border-dashed border-border/60 bg-card/30 flex flex-col items-center justify-center gap-3 rounded-b-lg">
      <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
        <Video className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div className="text-center">
        <p className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest">{label}</p>
        <p className="font-mono text-[9px] text-muted-foreground/30 mt-1">{path}</p>
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <main className="min-h-screen relative">
      {/* Grid background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--border) 40%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 40%, transparent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <PublicNav />

      {/* Hero */}
      <section className="relative max-w-360 mx-auto border-x border-border pt-14">
        <div className="px-6 sm:px-10 py-16 lg:py-24 flex flex-col gap-6 items-start">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-border bg-card font-mono text-[10px] text-primary uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            everything glitchgrab does
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-foreground lowercase">
            <span className="block">every feature.</span>
            <span className="block text-muted-foreground">one platform.</span>
          </h1>

          <p className="font-mono text-sm text-muted-foreground max-w-xl leading-relaxed border-l border-border pl-4">
            From the moment a bug happens to the moment it&apos;s resolved — Glitchgrab handles capture, triage, notification, and tracking. Here&apos;s everything it can do.
          </p>

          <Link
            href="/#waitlist"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary border border-primary/40 px-4 py-2 hover:bg-primary/5 transition-colors"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
            get early access
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-y border-border bg-card/10">
        <div className="max-w-360 mx-auto border-x border-border">
          <div className="px-6 sm:px-10 py-8 border-b border-border">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="text-primary">{"//"}</span> feature overview
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {FEATURES_GRID.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="bg-background p-6 flex flex-col gap-3 group hover:bg-card transition-colors"
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {f.label}
                  </div>
                  <p className="font-semibold text-foreground text-sm lowercase leading-snug">
                    {f.title}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GlitchRecord deep-dive */}
      <section className="border-b border-border bg-background">
        <div className="max-w-360 mx-auto border-x border-border">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Copy */}
            <div className="flex flex-col justify-center gap-6 px-6 sm:px-10 py-12 lg:py-16 border-b lg:border-b-0 lg:border-r border-border">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                <Video className="h-3.5 w-3.5" />
                glitchrecord · desktop app
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-foreground lowercase leading-tight">
                record screen.
                <br />
                <span className="text-muted-foreground">ai writes the issue.</span>
              </h2>

              <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-sm border-l border-border pl-4">
                GlitchRecord is the Glitchgrab desktop recorder. Hit record, reproduce the bug, stop. Every click, keystroke, and scroll is captured. The AI generates a narrated step-by-step tutorial and auto-files a structured GitHub issue — no writing required.
              </p>

              <ul className="flex flex-col gap-3 font-mono text-xs text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>captures clicks, scrolls, inputs, navigation — every interaction logged</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>AI generates narrated script from the recording — steps to reproduce written for you</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>one-click GitHub issue — title, body, labels, all pre-filled from the session</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>paired with Chrome extension — browser events captured alongside the screen recording</span>
                </li>
              </ul>

              <div className="border border-border bg-card/50 px-3 py-2 font-mono text-[10px] text-muted-foreground flex items-center gap-2">
                <Terminal className="h-3 w-3 text-primary" />
                <span>Works on macOS · Windows coming soon</span>
              </div>
            </div>

            {/* Image */}
            <div className="flex items-center justify-center px-6 sm:px-10 py-12 lg:py-16 bg-background/30">
              <div className="relative w-full max-w-lg">
                <div className="rounded-t-lg border border-border border-b-0 bg-card px-4 py-2.5 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                  <div className="ml-3 flex-1 bg-background border border-border rounded-sm px-3 py-0.5 font-mono text-[10px] text-muted-foreground">
                    GlitchRecord — screen recorder
                  </div>
                </div>
                {/* Swap Image for placeholder once image is ready */}
                <ImagePlaceholder path="/features/glitchrecord.webp" label="glitchrecord screenshot" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-lg"
                  style={{ boxShadow: "0 0 50px 8px color-mix(in srgb, var(--primary) 6%, transparent)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chrome extension deep-dive */}
      <section className="border-b border-border bg-card/20">
        <div className="max-w-360 mx-auto border-x border-border">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Image left */}
            <div className="flex items-center justify-center px-6 sm:px-10 py-12 lg:py-16 bg-background/30 border-b lg:border-b-0 lg:border-r border-border order-2 lg:order-1">
              <div className="relative w-full max-w-lg">
                <div className="rounded-t-lg border border-border border-b-0 bg-card px-4 py-2.5 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                  <div className="ml-3 flex-1 bg-background border border-border rounded-sm px-3 py-0.5 font-mono text-[10px] text-muted-foreground">
                    Chrome Extension — event capture
                  </div>
                </div>
                <ImagePlaceholder path="/features/extension.webp" label="chrome extension screenshot" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-lg"
                  style={{ boxShadow: "0 0 50px 8px color-mix(in srgb, var(--primary) 6%, transparent)" }}
                />
              </div>
            </div>

            {/* Copy right */}
            <div className="flex flex-col justify-center gap-6 px-6 sm:px-10 py-12 lg:py-16 order-1 lg:order-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                <GitFork className="h-3.5 w-3.5" />
                chrome extension · event capture
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-foreground lowercase leading-tight">
                every click.
                <br />
                <span className="text-muted-foreground">nothing missed.</span>
              </h2>

              <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-sm border-l border-border pl-4">
                Install the Glitchgrab Chrome extension and it works silently in the background during a GlitchRecord session. It captures every browser interaction — clicks, form inputs, navigation, scrolls — with full context about which element was touched and why.
              </p>

              <ul className="flex flex-col gap-3 font-mono text-xs text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>captures click, input, scroll, navigate, copy, paste events in real-time</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>rich element context — role, label, href, section, input type — no selector guessing</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>zero performance impact — no polling, lightweight service worker</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>works without login — capturing works, GitHub issue requires account</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp deep-dive */}
      <section className="border-b border-border bg-background">
        <div className="max-w-360 mx-auto border-x border-border">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Copy left */}
            <div className="flex flex-col justify-center gap-6 px-6 sm:px-10 py-12 lg:py-16 border-b lg:border-b-0 lg:border-r border-border">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5" />
                whatsapp · real-time alerts
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-foreground lowercase leading-tight">
                issue resolved?
                <br />
                <span className="text-muted-foreground">reporter taps to confirm.</span>
              </h2>

              <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-sm border-l border-border pl-4">
                Glitchgrab connects to WhatsApp via Meta Cloud API. Developers get notified when issues are assigned. Reporters get notified when their issue is resolved — with a quick-reply button to confirm or reopen. All without installing an app.
              </p>

              <ul className="flex flex-col gap-3 font-mono text-xs text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>assignment alert to developer — issue title, org, and GitHub link</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>resolution notification to reporter — one tap to confirm fix or reopen</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>daily reminder — open issues count for each developer, every morning</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  <span>weekly summary — resolved issues recap for the team, every Monday</span>
                </li>
              </ul>

              <div className="border border-primary/20 bg-primary/5 px-4 py-3 flex flex-col gap-1.5">
                <p className="font-mono text-[10px] text-primary uppercase tracking-widest">verify your number</p>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                  Add your WhatsApp number in dashboard settings. Verify with a 4-digit OTP — that&apos;s it. All alerts start immediately.
                </p>
              </div>
            </div>

            {/* Image right */}
            <div className="flex items-center justify-center px-6 sm:px-10 py-12 lg:py-16 bg-background/30">
              <div className="relative w-full max-w-lg">
                <div className="rounded-t-lg border border-border border-b-0 bg-card px-4 py-2.5 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                  <div className="ml-3 flex-1 bg-background border border-border rounded-sm px-3 py-0.5 font-mono text-[10px] text-muted-foreground">
                    WhatsApp — issue alerts
                  </div>
                </div>
                <ImagePlaceholder path="/features/whatsapp.webp" label="whatsapp notification screenshot" />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-lg"
                  style={{ boxShadow: "0 0 50px 8px color-mix(in srgb, var(--primary) 6%, transparent)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SDK + MCP quick section */}
      <section className="border-b border-border bg-card/10">
        <div className="max-w-360 mx-auto border-x border-border">
          <div className="px-6 sm:px-10 py-8 border-b border-border">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="text-primary">{"//"}</span> integrations
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border">

            {/* SDK */}
            <div className="bg-background p-6 sm:p-8 flex flex-col gap-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5" />
                next.js sdk
              </div>
              <h3 className="font-bold text-foreground lowercase leading-snug">3 lines. done.</h3>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                Install the package, wrap your root layout with <code className="text-foreground bg-card border border-border px-1 rounded-sm">GlitchgrabProvider</code>, and every production error gets captured automatically. Zero config, zero runtime overhead.
              </p>
              <div className="mt-auto space-y-1.5 border border-border bg-card/50 px-4 py-3 font-mono text-xs">
                <div className="text-muted-foreground/60">
                  <span className="text-primary">$</span> bun add glitchgrab
                </div>
                <div className="text-muted-foreground/60">
                  <span className="text-primary/50">// </span>wrap layout with GlitchgrabProvider
                </div>
                <div className="text-green-400/70">✓ auto-capture active</div>
              </div>
              <div className="flex flex-col gap-2 font-mono text-xs text-muted-foreground">
                <span className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> Next.js 13, 14, 15 supported</span>
                <span className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> signature-based dedup — no duplicate issues</span>
                <span className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> zero deps beyond React peer deps</span>
              </div>
            </div>

            {/* MCP */}
            <div className="bg-background p-6 sm:p-8 flex flex-col gap-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5" />
                mcp server
              </div>
              <h3 className="font-bold text-foreground lowercase leading-snug">works inside claude.</h3>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                Connect the Glitchgrab MCP server to Claude Desktop. File issues, fetch reports, and check repo health — all from inside your AI workflow without switching tabs.
              </p>
              <div className="flex flex-col gap-2 font-mono text-xs text-muted-foreground mt-auto">
                <span className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> Claude Desktop integration</span>
                <span className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> file issues via natural language</span>
                <span className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> same API, same token — no extra setup</span>
              </div>
            </div>

            {/* Mobile */}
            <div className="bg-background p-6 sm:p-8 flex flex-col gap-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                <Smartphone className="h-3.5 w-3.5" />
                mobile app
              </div>
              <h3 className="font-bold text-foreground lowercase leading-snug">dashboard on the go.</h3>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                Full Glitchgrab dashboard in a native iOS and Android shell. Share a screenshot from any app directly into Glitchgrab and create an issue in seconds — even away from your desk.
              </p>
              <div className="flex flex-col gap-2 font-mono text-xs text-muted-foreground mt-auto">
                <span className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> Android APK available now</span>
                <span className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> share intent — paste screenshot from any app</span>
                <span className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> deep links + secure token storage</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Analytics + SEO quick */}
      <section className="border-b border-border bg-background/40">
        <div className="max-w-360 mx-auto border-x border-border">
          <div className="px-6 sm:px-10 py-8 border-b border-border">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="text-primary">{"//"}</span> beyond bug tracking
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border">

            {/* Analytics */}
            <div className="bg-background p-6 sm:p-10 flex flex-col gap-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5" />
                analytics
              </div>
              <h3 className="text-xl font-bold text-foreground lowercase leading-snug">
                know how fast your team ships.
              </h3>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-sm border-l border-border pl-4">
                Track issues closed per day, team velocity, and which days are most productive — across every repo and org member. Switch between 7d, 30d, and 90d without any config.
              </p>
              <ul className="flex flex-col gap-2.5 font-mono text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> bar chart: issues closed per day by repo</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> avg velocity, best day, active days — all in one view</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> per-member breakdown across the org</li>
              </ul>
            </div>

            {/* SEO */}
            <div className="bg-background p-6 sm:p-10 flex flex-col gap-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                <ScanSearch className="h-3.5 w-3.5" />
                seo + google search console
              </div>
              <h3 className="text-xl font-bold text-foreground lowercase leading-snug">
                manage seo for every domain.
              </h3>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-sm border-l border-border pl-4">
                Meta tags, sitemaps, structured data, OG images — all managed from the Glitchgrab dashboard. Connect Google Search Console and see exactly what Google crawled and what it skipped.
              </p>
              <ul className="flex flex-col gap-2.5 font-mono text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> all domains in one view — personal + org repos</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> indexed vs not-indexed — grouped by crawl reason</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> one-click reindex — submit pages directly to Google</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="min-h-[50vh] flex flex-col items-center justify-center border-b border-border px-4 py-16 sm:py-24 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute font-bold text-foreground opacity-[0.02] tracking-tighter pointer-events-none select-none whitespace-nowrap text-[150px] sm:text-[200px]"
        >
          GLITCHGRAB
        </div>

        <div className="z-10 w-full max-w-2xl flex flex-col gap-6 items-center text-center">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-border bg-card font-mono text-[10px] text-primary uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            closed beta · limited seats
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-foreground lowercase">
            ready to ship faster?
          </h2>
          <p className="font-mono text-sm text-muted-foreground max-w-md">
            Join the closed beta. We&apos;re onboarding teams from the waitlist weekly — free tier, no credit card needed.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <Link
              href="/#waitlist"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary border border-primary/40 bg-primary/5 px-6 py-3 hover:bg-primary/10 transition-colors"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
              join the waitlist
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground border border-border px-6 py-3 hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              read the docs
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
