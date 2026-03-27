import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WaitlistForm } from "./waitlist-form";

const FLOWS = [
  {
    icon: "📝",
    title: "Handwritten Notes",
    desc: "Snap a photo of your notebook scribbles. AI reads your handwriting and creates a structured issue.",
    tag: "Unique to Glitchgrab",
  },
  {
    icon: "💥",
    title: "Auto-Capture SDK",
    desc: "Drop in our SDK. Production errors get captured with full context — stack trace, visited pages, screenshot.",
    tag: "Zero config",
  },
  {
    icon: "🐛",
    title: "Report Button",
    desc: "Your users click 'Report Error' — context is captured automatically, issue lands in GitHub.",
    tag: "End-user friendly",
  },
  {
    icon: "📸",
    title: "Screenshot Upload",
    desc: "Upload a screenshot on the dashboard, add a note. AI does the rest — title, body, labels, severity.",
    tag: "Dashboard",
  },
];

const STEPS = [
  { num: "01", title: "Connect GitHub", desc: "OAuth in, pick a repo, get a token." },
  { num: "02", title: "Drop in the SDK", desc: "One component in your layout. That's it." },
  { num: "03", title: "Bugs become issues", desc: "AI writes the issue. Dedup prevents spam. GitHub gets a clean issue." },
];

const COMPARISONS = [
  { name: "Jam.dev", handwritten: false, sdk: false, ai: false, dedup: false, mcp: false, oss: false },
  { name: "Marker.io", handwritten: false, sdk: false, ai: false, dedup: false, mcp: false, oss: false },
  { name: "BetterBugs", handwritten: false, sdk: true, ai: "Partial", dedup: false, mcp: false, oss: false },
  { name: "Sentry", handwritten: false, sdk: true, ai: false, dedup: true, mcp: false, oss: true },
  { name: "Glitchgrab", handwritten: true, sdk: true, ai: true, dedup: true, mcp: true, oss: true },
];

function Check() {
  return <span className="text-green">✓</span>;
}
function Cross() {
  return <span className="text-red/50">✗</span>;
}
function CellValue({ val }: { val: boolean | string }) {
  if (val === true) return <Check />;
  if (val === false) return <Cross />;
  return <span className="text-yellow text-xs">{val}</span>;
}

export default async function LandingPage() {
  const session = await auth();
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Glitchgrab" width={28} height={28} className="rounded-full sm:w-8 sm:h-8" />
            <span className="font-semibold text-base sm:text-lg tracking-tight">glitchgrab</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {session?.user ? (
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <a href="#waitlist">
                  <Button size="sm">Join Waitlist</Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center px-4 pt-16 pb-8 text-center overflow-hidden sm:px-6 sm:pt-20">
        {/* Background grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blob */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px] sm:h-125 sm:w-125 sm:blur-[120px]" />

        <div className="relative z-10 w-full max-w-5xl">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
            {/* Left — text content */}
            <div className="flex-1 text-center lg:text-left">
              <Badge variant="outline" className="mb-4 gap-2 sm:mb-6">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
                Open source — shipping soon
              </Badge>

              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Grab the glitch.
                <br />
                <span className="text-primary">Ship the fix.</span>
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground leading-relaxed sm:mt-6 sm:text-lg lg:mx-0">
                Turn messy bug reports — handwritten notes, screenshots, production errors — into
                well-structured GitHub issues. Powered by AI.
              </p>

              <div className="mt-6 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center lg:justify-start sm:gap-4">
                <a href="#waitlist">
                  <Button size="lg" className="w-full sm:w-auto">Join the Waitlist</Button>
                </a>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">See how it works</Button>
                </a>
              </div>
            </div>

            {/* Right — vertical video in phone frame */}
            <div className="relative mx-auto w-[240px] shrink-0 sm:w-[270px] lg:w-[300px]">
              {/* Phone bezel */}
              <div className="rounded-[2.5rem] border-2 border-border/50 bg-background/50 p-2 shadow-2xl shadow-primary/5 backdrop-blur-sm">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-background" />
                {/* Video */}
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="aspect-[9/16] w-full rounded-[2rem] bg-black object-cover"
                >
                  <source src="https://cdn.glitchgrab.dev/meta/Timeline.mp4" type="video/mp4" />
                </video>
              </div>
              {/* Glow behind phone */}
              <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-primary/10 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Input Flows */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
            Four ways in. One clean issue out.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto sm:mt-4 sm:text-base">
            No matter how the bug reaches you — a photo, a crash, a user complaint — Glitchgrab
            turns it into a structured GitHub issue.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          {FLOWS.map((flow) => (
            <Card
              key={flow.title}
              className="transition hover:border-muted-foreground/30"
            >
              <CardContent className="p-5 sm:p-8">
                <div className="text-3xl mb-3 sm:text-4xl sm:mb-4">{flow.icon}</div>
                <Badge variant="secondary" className="mb-2 sm:mb-3 text-primary bg-primary/10">
                  {flow.tag}
                </Badge>
                <h3 className="text-lg font-semibold mb-1.5 sm:text-xl sm:mb-2">{flow.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{flow.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Stupid simple setup</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">Three steps. Under five minutes.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step) => (
            <div key={step.num} className="relative">
              <span className="text-4xl font-bold text-primary/10 font-mono sm:text-6xl">{step.num}</span>
              <h3 className="mt-1 text-lg font-semibold sm:mt-2 sm:text-xl">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground sm:mt-2">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Pipeline */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">AI does the heavy lifting</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto sm:mt-4 sm:text-base">
            Not AI-assisted. AI-generated. The full issue — title, description, labels, severity —
            written from raw input.
          </p>
        </div>

        <Card>
          <CardContent className="p-5 sm:p-12">
            <div className="flex flex-col gap-4 sm:gap-6">
              {[
                { label: "Normalize", desc: "Image, text, or error → standard format" },
                { label: "Enrich", desc: "Pull repo context — existing issues, labels" },
                { label: "Dedup", desc: "Check if this bug already exists" },
                { label: "Generate", desc: "AI writes the complete issue" },
                { label: "Push", desc: "Create GitHub issue + attach screenshots" },
              ].map((step, i) => (
                <div key={step.label} className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold sm:h-10 sm:w-10 sm:text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base">{step.label}</h4>
                    <p className="text-xs text-muted-foreground sm:text-sm">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-border bg-background p-3 text-center sm:mt-8 sm:p-4">
              <p className="text-xs text-muted-foreground sm:text-sm">
                Bring your own key (Claude or OpenAI) or use our platform-provided AI.
                <br />
                <span className="text-primary">Your data, your choice.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">How we compare</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">Not trying to replace Sentry. Just filling the gap between &quot;I found a bug&quot; and &quot;here&apos;s a well-written issue.&quot;</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-left">
                <th className="px-3 py-3 font-medium text-muted-foreground sm:px-6 sm:py-4">Tool</th>
                <th className="px-2 py-3 font-medium text-muted-foreground text-center sm:px-4 sm:py-4">Handwritten</th>
                <th className="px-2 py-3 font-medium text-muted-foreground text-center sm:px-4 sm:py-4">SDK</th>
                <th className="px-2 py-3 font-medium text-muted-foreground text-center sm:px-4 sm:py-4">AI</th>
                <th className="px-2 py-3 font-medium text-muted-foreground text-center sm:px-4 sm:py-4">Dedup</th>
                <th className="px-2 py-3 font-medium text-muted-foreground text-center sm:px-4 sm:py-4">MCP</th>
                <th className="px-2 py-3 font-medium text-muted-foreground text-center sm:px-4 sm:py-4">OSS</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISONS.map((row) => (
                <tr
                  key={row.name}
                  className={`border-b border-border last:border-0 ${
                    row.name === "Glitchgrab" ? "bg-primary/5" : ""
                  }`}
                >
                  <td className={`px-3 py-3 font-medium sm:px-6 sm:py-4 ${row.name === "Glitchgrab" ? "text-primary" : ""}`}>
                    {row.name}
                  </td>
                  <td className="px-2 py-3 text-center sm:px-4 sm:py-4"><CellValue val={row.handwritten} /></td>
                  <td className="px-2 py-3 text-center sm:px-4 sm:py-4"><CellValue val={row.sdk} /></td>
                  <td className="px-2 py-3 text-center sm:px-4 sm:py-4"><CellValue val={row.ai} /></td>
                  <td className="px-2 py-3 text-center sm:px-4 sm:py-4"><CellValue val={row.dedup} /></td>
                  <td className="px-2 py-3 text-center sm:px-4 sm:py-4"><CellValue val={row.mcp} /></td>
                  <td className="px-2 py-3 text-center sm:px-4 sm:py-4"><CellValue val={row.oss} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Simple pricing</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">Two plans. No surprises. Cancel anytime.</p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-6">
          {/* BYOK */}
          <Card>
            <CardContent className="p-5 sm:p-8">
              <h3 className="text-lg font-semibold">Pro (BYOK)</h3>
              <div className="mt-3 flex items-baseline gap-1 sm:mt-4">
                <span className="text-3xl font-bold sm:text-4xl">$5</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">Bring your own OpenAI or Claude key</p>
              <ul className="mt-6 space-y-2.5 text-xs sm:mt-8 sm:space-y-3 sm:text-sm">
                {[
                  "Unlimited repos",
                  "Unlimited issues",
                  "SDK auto-capture",
                  "Smart dedup & updates",
                  "Screenshot analysis",
                  "You provide your AI key",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green">✓</span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Platform */}
          <Card className="border-2 border-primary overflow-visible relative">
            <CardContent className="p-5 pt-7 sm:p-8 sm:pt-8">
              <Badge className="absolute -top-2.5 left-4 sm:left-auto sm:right-6 sm:-top-3 z-10">Recommended</Badge>
              <h3 className="text-lg font-semibold">Pro (Platform AI)</h3>
              <div className="mt-3 flex items-baseline gap-1 sm:mt-4">
                <span className="text-3xl font-bold text-primary sm:text-4xl">$10</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">We provide AI — zero setup</p>
              <ul className="mt-6 space-y-2.5 text-xs sm:mt-8 sm:space-y-3 sm:text-sm">
                {[
                  "Unlimited repos",
                  "100 issues created/mo",
                  "Updates & closes are free",
                  "SDK auto-capture",
                  "Screenshot analysis",
                  "No API key needed",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 text-center sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Get early access</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto sm:mt-4">
              We&apos;re building Glitchgrab in public. Join the waitlist to get early access, shape
              the product, and lock in launch pricing.
            </p>

            <WaitlistForm />

            <p className="mt-3 text-xs text-muted-foreground sm:mt-4">No spam. Just launch updates.</p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Glitchgrab" width={20} height={20} className="rounded-full sm:w-6 sm:h-6" />
              <span className="text-xs font-medium sm:text-sm">glitchgrab</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground sm:text-sm">
              <Link href="/privacy" className="hover:text-primary transition">Privacy</Link>
              <Link href="/terms" className="hover:text-primary transition">Terms</Link>
              <Link href="/refund" className="hover:text-primary transition">Refunds</Link>
              <Link href="/contact" className="hover:text-primary transition">Contact</Link>
              <Link href="/changelog" className="hover:text-primary transition">Changelog</Link>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4 sm:text-sm">
            Built by{" "}
            <a
              href="https://github.com/webnaresh"
              className="hover:text-primary transition"
              target="_blank"
              rel="noopener"
            >
              Naresh
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
