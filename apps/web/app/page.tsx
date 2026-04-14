import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { softwareApplicationSchema, breadcrumbSchema } from "@/lib/schema";

import { WaitlistForm } from "./waitlist-form";
import { ContactForm } from "./contact-form";
import {
  DashboardChatAnim,
  AutoCaptureAnim,
  ReportButtonAnim,
  DedupAnim,
} from "./flow-animations";
import { HeroVideo } from "./hero-video";
import { HeroTerminal } from "./hero-terminal";
import { HeroWaitlist } from "./hero-waitlist";
import {
  Github,
  ArrowRight,
  ChevronsRight,
  CheckCircle2,
  Funnel,
  Brain,
  Layers,
  FileCode,
  GitMerge,
  Scan,
  Plug,
  MessageSquare,
  ImageIcon,
} from "lucide-react";

const PIPELINE = [
  { n: "01", label: "Normalize", desc: "Strip PII & format", icon: Funnel },
  { n: "02", label: "Enrich", desc: "Map to codebase", icon: Brain },
  { n: "03", label: "Dedup", desc: "Semantic match", icon: Layers },
  { n: "04", label: "Generate", desc: "Draft markdown", icon: FileCode },
  { n: "05", label: "Push", desc: "Create GitHub issue", icon: Github },
];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
    >
      {children}
    </a>
  );
}

type FeatureTone = "primary" | "warn" | "neutral";

function FeatureCard({
  mode,
  meta,
  icon: Icon,
  tone,
  title,
  desc,
  children,
  borderRight,
  borderBottom,
}: {
  mode: string;
  meta: string;
  icon: typeof Plug;
  tone: FeatureTone;
  title: string;
  desc: string;
  children: React.ReactNode;
  borderRight?: boolean;
  borderBottom?: boolean;
}) {
  const toneText =
    tone === "primary"
      ? "text-primary"
      : tone === "warn"
      ? "text-yellow-400"
      : "text-foreground";
  const stripColor =
    tone === "primary"
      ? "group-hover:bg-primary"
      : tone === "warn"
      ? "group-hover:bg-yellow-400"
      : "group-hover:bg-foreground";

  return (
    <div
      className={`group relative p-6 sm:p-8 transition-colors hover:bg-muted/20 flex flex-col gap-5 min-h-[360px] border-b md:border-b-0 border-border ${
        borderRight ? "md:border-r" : ""
      } ${borderBottom ? "md:border-b" : ""}`}
    >
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-[3px] bg-transparent transition-colors ${stripColor}`}
      />

      <div className="flex justify-between items-start gap-3">
        <div
          className={`flex items-center gap-2 font-mono text-xs uppercase tracking-widest ${toneText}`}
        >
          <Icon className="h-3.5 w-3.5" />
          [MODE: {mode}]
        </div>
        <div className="font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 shrink-0">
          {meta}
        </div>
      </div>

      <div>
        <h3 className="text-lg text-foreground mb-2 font-semibold">{title}</h3>
        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
          {desc}
        </p>
      </div>

      <div className="mt-auto">{children}</div>
    </div>
  );
}

function CodeSnippet() {
  return (
    <div className="bg-background border border-border p-3 font-mono text-[10px] text-muted-foreground overflow-hidden relative group/code hover:border-primary/30 transition-colors">
      <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse group-hover/code:bg-green-400 transition-colors" />
      <code className="block whitespace-pre-wrap leading-relaxed">
        <span className="text-primary">&gt;</span> import {"{ GlitchgrabProvider }"} from{" "}
        <span className="text-green-400">&apos;glitchgrab&apos;</span>;
        {"\n"}
        {"\n"}
        <span className="text-primary">&gt;</span> export default function RootLayout() {"{"}
        {"\n"}
        {"  "}return &lt;GlitchgrabProvider token=
        <span className="text-green-400">&quot;gg_...&quot;</span>/&gt;;
        {"\n"}
        {"}"}
      </code>
    </div>
  );
}

function ChatBubbles() {
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-muted/50 border border-border/60 p-2 font-mono text-[10px] text-muted-foreground max-w-[85%]">
        <span className="text-primary/70">user@dev &gt;</span> &quot;The checkout button is spinning forever on production&quot;
      </div>
      <div className="bg-background border border-primary/30 border-l-2 border-l-primary p-2 font-mono text-[10px] max-w-[85%] self-end relative">
        <CheckCircle2 className="h-3 w-3 text-primary absolute -left-1.5 -top-1.5 bg-background rounded-full" />
        <span className="text-primary">[agent/sys] &gt;</span>{" "}
        <span className="text-foreground">
          Drafted issue &quot;Infinite loader on /checkout&quot;. Requesting repro steps...
        </span>
      </div>
    </div>
  );
}

function VisionPreview() {
  return (
    <div className="relative h-20 bg-background border border-border overflow-hidden flex items-center justify-center p-2 group/vis">
      <div className="font-mono text-[8px] text-border break-all leading-none group-hover/vis:opacity-20 transition-opacity duration-500">
        data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAH0CAYAAADkvqMgAAAAB3RJTUUH5QUUEwA5
        K5TXXQAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAAJiS0dEAP+Hj8y/AAA...
      </div>
      <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] opacity-0 group-hover/vis:opacity-100 transition-opacity duration-500">
        <div className="flex items-center gap-2 border border-primary bg-card px-3 py-1 font-mono text-xs text-primary">
          <Scan className="h-3.5 w-3.5" />
          CheckoutModal.tsx
        </div>
      </div>
    </div>
  );
}

function DedupVisual() {
  return (
    <div className="flex flex-col gap-1 font-mono text-[10px]">
      <div className="flex items-center justify-between gap-2 p-1.5 border border-border bg-background">
        <span className="text-muted-foreground truncate">Report A: &quot;Site down&quot;</span>
        <span className="text-border">→</span>
        <span className="text-primary">hash: 8f2b</span>
      </div>
      <div className="flex items-center justify-between gap-2 p-1.5 border border-border bg-background">
        <span className="text-muted-foreground truncate">Report B: &quot;502 gateway&quot;</span>
        <span className="text-border">→</span>
        <span className="text-primary">hash: 8f2b</span>
      </div>
      <div className="text-center text-yellow-400 mt-1.5 uppercase tracking-widest border-t border-dashed border-border pt-1.5 group-hover:text-green-400 transition-colors flex items-center justify-center gap-1.5">
        <GitMerge className="h-3 w-3" />
        merged into issue #42
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  alternates: {
    canonical: "https://glitchgrab.dev",
  },
};

export default function LandingPage() {
  const homeBreadcrumb = breadcrumbSchema([
    { name: "Home", url: "https://glitchgrab.dev" },
  ]);

  return (
    <main className="min-h-screen relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeBreadcrumb) }}
      />
      {/* Global grid background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--border) 40%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border) 40%, transparent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-360 items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.25)]">
              <Image src="/logo.png" alt="" width={16} height={16} className="rounded-sm" />
            </div>
            <span className="font-mono text-sm font-bold tracking-tight text-foreground lowercase">
              glitchgrab
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 h-full border-x border-border px-8">
            <NavLink href="#features">/features</NavLink>
            <NavLink href="#pipeline">/pipeline</NavLink>
            <NavLink href="/docs">/docs</NavLink>
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

          <a
            href="#waitlist"
            className="group flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="text-border group-hover:text-primary transition-colors">[</span>
            <kbd className="font-mono text-[10px] py-0.5 px-1.5 border border-border bg-card rounded-sm">
              ⌘ K
            </kbd>
            <span className="hidden sm:inline">Join Waitlist</span>
            <span className="sm:hidden">Waitlist</span>
            <span className="text-border group-hover:text-primary transition-colors">]</span>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-360 mx-auto border-x border-border pt-14">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-8 items-center px-4 sm:px-6 py-16 lg:py-24">
          <div className="lg:col-span-6 flex flex-col items-start gap-6 lg:gap-7 z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-border bg-card font-mono text-[10px] text-primary uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              open source · beta
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05] text-foreground lowercase">
              <span className="block">Grab the glitch.</span>
              <span className="block text-muted-foreground">Ship the fix.</span>
            </h1>

            <p className="font-mono text-sm text-muted-foreground max-w-md leading-relaxed border-l border-border pl-4">
              Drop-in Next.js SDK. Converts messy stack traces, fragmented
              screenshots, and vague user complaints into precisely structured
              GitHub issues.
            </p>

            <HeroWaitlist />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                open source engine
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                next.js ready
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                zero config
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 z-10 w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-xl">
              <HeroTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* Features — log entries grid */}
      <section id="features" className="border-y border-border bg-card/30">
        <div className="max-w-360 mx-auto border-x border-border">
          <div className="border-b border-border p-4 flex items-center justify-between bg-background/40">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <span className="text-primary">/</span> sys.capture_methods
            </div>
            <div className="font-mono text-[10px] text-muted-foreground/70">
              4 modes active
            </div>
          </div>

          <div className="grid md:grid-cols-2">
            <FeatureCard
              mode="AUTO_CAPTURE"
              meta="ts-node // edge"
              icon={Plug}
              tone="primary"
              title="Drop-in SDK intercept"
              desc="Runs at the edge or client side. Automatically grabs stack traces, DOM state, and recent network requests the millisecond a throw occurs."
              borderRight
              borderBottom
            >
              <CodeSnippet />
            </FeatureCard>

            <FeatureCard
              mode="REPL_CHAT"
              meta="cli // web"
              icon={MessageSquare}
              tone="neutral"
              title="Conversational triage"
              desc="Paste a massive dumped log or vague Slack message into the command center. The AI parses the mess and extracts actionable repro steps."
              borderBottom
            >
              <ChatBubbles />
            </FeatureCard>

            <FeatureCard
              mode="VISION_PARSE"
              meta="base64 // blob"
              icon={ImageIcon}
              tone="neutral"
              title="Vision-based reverse engineering"
              desc="Users drop a screenshot of a broken UI component. Models analyze the DOM context and map the visual bug to the exact React component."
              borderRight
            >
              <VisionPreview />
            </FeatureCard>

            <FeatureCard
              mode="VECTOR_DEDUP"
              meta="pinecone // semantic"
              icon={GitMerge}
              tone="warn"
              title="Semantic issue collapsing"
              desc="Before opening a new issue, every report is converted to embeddings. 50 users reporting the same downtime in different words — all map to a single tracking issue."
            >
              <DedupVisual />
            </FeatureCard>

            {/* Hidden — keep animations available but not used; see DashboardChatAnim etc */}
            <div className="hidden">
              <DashboardChatAnim />
              <AutoCaptureAnim />
              <ReportButtonAnim />
              <DedupAnim />
            </div>
          </div>
        </div>
      </section>

      {/* How it works — CLI transcript (left) + demo video (right) */}
      <section id="how-it-works" className="bg-card/30 border-b border-border">
        <div className="max-w-360 mx-auto border-x border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <span className="text-primary">/</span> docs.installation
            </div>
            <div className="font-mono text-[10px] text-muted-foreground/70">
              45s walkthrough available
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-0">
            {/* Left — CLI transcript */}
            <div className="px-4 sm:px-8 py-12 lg:py-16 lg:border-r border-border">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8 flex items-center gap-2">
                <span className="w-1 h-3 bg-primary inline-block" />
                cli install transcript
              </h2>

              <div className="font-mono text-sm space-y-6">
                {[
                  {
                    cmd: "bun install glitchgrab",
                    output: [
                      "+ glitchgrab@latest",
                      "added 1 package · audited 0 vulnerabilities",
                    ],
                    outputHighlightFirst: true,
                  },
                  {
                    cmd: "npx glitchgrab login --provider=github",
                    output: [
                      "Authenticating via device flow...",
                      "Waiting for browser confirmation... Success",
                      "Linked: acme-corp/production",
                    ],
                  },
                  {
                    cmd: "glitchgrab watch --auto-issue",
                    output: [
                      "[SYS] Agent daemon started on PID 49202",
                      "[SYS] Listening for unhandled exceptions...",
                    ],
                    blink: true,
                  },
                ].map((step, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-primary font-bold">❯</span>
                      <span className="text-foreground">{step.cmd}</span>
                      {step.blink && (
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
                      )}
                    </div>
                    <div className="border-l border-border ml-1.25 pl-5 py-2 text-muted-foreground text-xs space-y-0.5">
                      {step.output.map((line, j) => (
                        <div
                          key={j}
                          className={
                            step.outputHighlightFirst && j === 0
                              ? "text-green-400"
                              : ""
                          }
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — demo video */}
            <div className="px-4 sm:px-8 py-12 lg:py-16 flex flex-col gap-4 border-t lg:border-t-0 border-border">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-3 bg-primary inline-block" />
                demo.mp4 · 45s
              </h2>
              <div className="flex-1 flex items-center justify-center">
                <HeroVideo src="https://cdn.glitchgrab.dev/meta/Timeline.mp4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Pipeline */}
      <section id="pipeline" className="border-y border-border bg-background">
        <div className="max-w-360 mx-auto border-x border-border py-12 sm:py-16">
          <div className="px-4 sm:px-6 mb-10 flex items-end justify-between flex-wrap gap-3">
            <div>
              <div className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase mb-1">
                Architecture
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground uppercase tracking-tight">
                Processing Pipeline
              </h2>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 border border-green-400/40 text-green-400 bg-green-400/10 uppercase tracking-widest">
              Status: Operational
            </span>
          </div>

          <div className="px-4 sm:px-6 pb-8 overflow-x-auto pipeline-scroll">
            <div className="flex items-stretch gap-1.5 min-w-max pb-2">
              <div className="flex flex-col gap-2 w-36 xl:w-40 shrink-0">
                <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  Input
                </div>
                <div className="border border-border bg-background p-3 border-l-4 border-l-muted-foreground text-xs h-28 flex items-center">
                  <ul className="text-muted-foreground space-y-1 font-mono text-[11px]">
                    <li>- Stack traces</li>
                    <li>- Screenshots</li>
                    <li>- User reports</li>
                  </ul>
                </div>
              </div>

              {PIPELINE.map((step) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.n} className="flex items-center">
                    <div className="w-5 xl:w-6 flex items-center justify-center text-border shrink-0">
                      <ChevronsRight className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col gap-2 w-28 xl:w-32 shrink-0">
                      <div className="font-mono text-[10px] text-primary uppercase tracking-widest text-center truncate">
                        {step.n}. {step.label}
                      </div>
                      <div className="border border-primary/30 bg-card p-2 text-xs h-28 flex flex-col items-center justify-center text-center gap-1.5 hover:border-primary transition-colors group/step">
                        <StepIcon className="h-5 w-5 text-foreground group-hover/step:text-primary transition-colors" />
                        <span className="font-mono text-[10px] text-foreground leading-tight">
                          {step.desc}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="w-5 xl:w-6 flex items-center justify-center text-border shrink-0">
                <ChevronsRight className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-2 w-36 xl:w-40 shrink-0">
                <div className="font-mono text-[10px] text-foreground uppercase tracking-widest">
                  Output
                </div>
                <div className="border border-border bg-card p-3 border-r-4 border-r-primary text-xs h-28 flex flex-col justify-center">
                  <div className="font-bold text-foreground mb-1">
                    Structured issue
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground leading-tight">
                    Labels · Context · Repro
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist — subscribe.sh */}
      <section
        id="waitlist"
        className="min-h-[60vh] flex flex-col items-center justify-center border-b border-border px-4 py-16 sm:py-24 relative overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute font-bold text-foreground opacity-[0.02] tracking-tighter pointer-events-none select-none whitespace-nowrap text-[180px] sm:text-[240px]"
        >
          BETA ACCESS
        </div>

        <div className="z-10 w-full max-w-2xl flex flex-col gap-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground lowercase">
              Join the closed beta
            </h2>
            <p className="font-mono text-sm text-muted-foreground">
              We&apos;re onboarding teams from the waitlist weekly.
            </p>
          </div>

          <div className="border border-border bg-card p-1 w-full shadow-2xl shadow-black/40">
            <div className="bg-background flex items-center flex-wrap sm:flex-nowrap gap-1 p-4">
              <span className="text-green-400 font-bold font-mono">~</span>
              <span className="text-primary font-bold font-mono mr-1">❯</span>
              <span className="text-foreground font-mono mr-1">
                ./subscribe.sh --email=
              </span>
              <div className="flex-1 min-w-50">
                <WaitlistForm />
              </div>
            </div>
          </div>

          <div className="text-center font-mono text-[10px] text-muted-foreground border border-border/50 py-1 px-3 self-center rounded bg-card">
            Press{" "}
            <kbd className="border border-border px-1 rounded mx-1 bg-background">
              Enter ↵
            </kbd>{" "}
            to execute
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="mb-8">
          <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="w-1 h-3 bg-primary inline-block" />
            /contact
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Got questions? <span className="text-primary">Talk to us.</span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground mt-2">
            Feature request, feedback, partnership — we read every message.
          </p>
        </div>

        <div className="border border-border bg-card p-5 sm:p-8 rounded-md">
          <ContactForm />
        </div>
      </section>

      {/* Footer */}
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
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Docs
                </Link>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  How it works
                </a>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Changelog
                </Link>
              </li>
              <li>
                <a
                  href="#waitlist"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
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
                  href="https://github.com/webnaresh/glitchgrab"
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Github className="h-3 w-3" /> GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/glitchgrab"
                  target="_blank"
                  rel="noopener"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  npm Package
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
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
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/refund"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
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
              href="https://github.com/webnaresh/glitchgrab/blob/main/LICENSE"
              target="_blank"
              rel="noopener"
              className="text-primary hover:underline"
            >
              MIT License
            </a>
            <span className="mx-2">·</span>
            <ArrowRight className="inline h-3 w-3 align-middle" /> built for devs
          </p>
        </div>
      </footer>
    </main>
  );
}
