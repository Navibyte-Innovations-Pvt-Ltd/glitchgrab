import Image from "next/image";
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

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Image src="/og-image.png" alt="Glitchgrab" width={32} height={32} className="rounded-full" />
            <span className="font-semibold text-lg tracking-tight">glitchgrab</span>
          </div>
          <a
            href="#waitlist"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover"
          >
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center overflow-hidden">
        {/* Background grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--color-accent) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glow blob */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]" />

        <div className="relative z-10 max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-text-muted">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse-glow" />
            Open source — shipping soon
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
            Grab the glitch.
            <br />
            <span className="text-accent">Ship the fix.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-text-muted leading-relaxed">
            Turn messy bug reports — handwritten notes, screenshots, production errors — into
            well-structured GitHub issues. Powered by AI.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#waitlist"
              className="rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-bg transition hover:bg-accent-hover hover:scale-105"
            >
              Join the Waitlist
            </a>
            <a
              href="#how-it-works"
              className="rounded-xl border border-border px-8 py-3.5 text-base font-medium text-text-muted transition hover:border-border-bright hover:text-text"
            >
              See how it works
            </a>
          </div>

          {/* Code preview */}
          <div className="mx-auto mt-16 max-w-lg rounded-xl border border-border bg-bg-card p-6 text-left font-mono text-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full bg-red/60" />
              <div className="h-3 w-3 rounded-full bg-yellow/60" />
              <div className="h-3 w-3 rounded-full bg-green/60" />
              <span className="ml-2 text-text-dim text-xs">app/layout.tsx</span>
            </div>
            <pre className="text-text-muted leading-relaxed">
              <code>
{`import { `}<span className="text-accent">GlitchgrabProvider</span>{` } from "@glitchgrab/nextjs"

export default function Layout({ children }) {
  return (
    <`}<span className="text-accent">GlitchgrabProvider</span>{` token="`}<span className="text-green">gg_your_token</span>{`">
      {children}
    </`}<span className="text-accent">GlitchgrabProvider</span>{`>
  )
}`}
              </code>
            </pre>
            <div className="mt-4 glow-line" />
            <p className="mt-3 text-xs text-text-dim text-center">
              That&apos;s it. Errors become GitHub issues automatically.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Input Flows */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Four ways in. One clean issue out.
          </h2>
          <p className="mt-4 text-text-muted max-w-lg mx-auto">
            No matter how the bug reaches you — a photo, a crash, a user complaint — Glitchgrab
            turns it into a structured GitHub issue.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {FLOWS.map((flow) => (
            <div
              key={flow.title}
              className="group rounded-2xl border border-border bg-bg-card p-8 transition hover:border-border-bright hover:bg-bg-card-hover"
            >
              <div className="text-4xl mb-4">{flow.icon}</div>
              <div className="inline-block rounded-full bg-accent-dim px-3 py-1 text-xs text-accent font-medium mb-3">
                {flow.tag}
              </div>
              <h3 className="text-xl font-semibold mb-2">{flow.title}</h3>
              <p className="text-text-muted leading-relaxed">{flow.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Stupid simple setup</h2>
          <p className="mt-4 text-text-muted">Three steps. Under five minutes.</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.num} className="relative">
              <span className="text-6xl font-bold text-accent/10 font-mono">{step.num}</span>
              <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Pipeline */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">AI does the heavy lifting</h2>
          <p className="mt-4 text-text-muted max-w-lg mx-auto">
            Not AI-assisted. AI-generated. The full issue — title, description, labels, severity —
            written from raw input.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-card p-8 sm:p-12">
          <div className="flex flex-col gap-6">
            {[
              { label: "Normalize", desc: "Image, text, or error → standard format" },
              { label: "Enrich", desc: "Pull repo context — existing issues, labels" },
              { label: "Dedup", desc: "Check if this bug already exists" },
              { label: "Generate", desc: "AI writes the complete issue" },
              { label: "Push", desc: "Create GitHub issue + attach screenshots" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent font-mono text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-semibold">{step.label}</h4>
                  <p className="text-sm text-text-muted">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-border bg-bg p-4 text-center">
            <p className="text-sm text-text-muted">
              Bring your own key (Claude or OpenAI) or use our platform-provided AI.
              <br />
              <span className="text-accent">Your data, your choice.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">How we compare</h2>
          <p className="mt-4 text-text-muted">Not trying to replace Sentry. Just filling the gap between &quot;I found a bug&quot; and &quot;here&apos;s a well-written issue.&quot;</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-card text-left">
                <th className="px-6 py-4 font-medium text-text-muted">Tool</th>
                <th className="px-4 py-4 font-medium text-text-muted text-center">Handwritten</th>
                <th className="px-4 py-4 font-medium text-text-muted text-center">SDK</th>
                <th className="px-4 py-4 font-medium text-text-muted text-center">AI Issues</th>
                <th className="px-4 py-4 font-medium text-text-muted text-center">Dedup</th>
                <th className="px-4 py-4 font-medium text-text-muted text-center">MCP</th>
                <th className="px-4 py-4 font-medium text-text-muted text-center">OSS</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISONS.map((row) => (
                <tr
                  key={row.name}
                  className={`border-b border-border last:border-0 ${
                    row.name === "Glitchgrab" ? "bg-accent/5" : ""
                  }`}
                >
                  <td className={`px-6 py-4 font-medium ${row.name === "Glitchgrab" ? "text-accent" : ""}`}>
                    {row.name}
                  </td>
                  <td className="px-4 py-4 text-center"><CellValue val={row.handwritten} /></td>
                  <td className="px-4 py-4 text-center"><CellValue val={row.sdk} /></td>
                  <td className="px-4 py-4 text-center"><CellValue val={row.ai} /></td>
                  <td className="px-4 py-4 text-center"><CellValue val={row.dedup} /></td>
                  <td className="px-4 py-4 text-center"><CellValue val={row.mcp} /></td>
                  <td className="px-4 py-4 text-center"><CellValue val={row.oss} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Simple pricing</h2>
          <p className="mt-4 text-text-muted">No per-seat nonsense. One plan that covers everything.</p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-bg-card p-8">
            <h3 className="text-lg font-semibold">Free</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-text-muted">/month</span>
            </div>
            <p className="mt-2 text-sm text-text-muted">For indie devs trying it out</p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "1 repo",
                "30 issues/month",
                "SDK auto-capture",
                "Report button",
                "BYOK only (bring your AI key)",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-green">✓</span>
                  <span className="text-text-muted">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-accent bg-bg-card p-8 relative">
            <div className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-bg">
              Popular
            </div>
            <h3 className="text-lg font-semibold">Pro</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-accent">$20</span>
              <span className="text-text-muted">/month</span>
            </div>
            <p className="mt-2 text-sm text-text-muted">For teams shipping fast</p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Unlimited repos",
                "Unlimited issues",
                "Handwritten notes → issues",
                "AI deduplication",
                "MCP server access",
                "Platform-provided AI (no key needed)",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-accent">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-text-dim">
          Think $20/mo is fair? Too much? Too little?{" "}
          <a href="#waitlist" className="text-accent underline underline-offset-4 hover:text-accent-hover">
            Tell us when you join.
          </a>
        </p>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="mx-auto max-w-2xl px-6 py-24">
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 sm:p-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Get early access</h2>
          <p className="mt-4 text-text-muted max-w-md mx-auto">
            We&apos;re building Glitchgrab in public. Join the waitlist to get early access, shape
            the product, and lock in launch pricing.
          </p>

          <WaitlistForm />

          <p className="mt-4 text-xs text-text-dim">No spam. Just launch updates.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Image src="/og-image.png" alt="Glitchgrab" width={24} height={24} className="rounded-full" />
            <span className="text-sm font-medium">glitchgrab</span>
          </div>
          <p className="text-sm text-text-dim">
            Built by{" "}
            <a
              href="https://github.com/webnaresh"
              className="text-text-muted hover:text-accent transition"
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
