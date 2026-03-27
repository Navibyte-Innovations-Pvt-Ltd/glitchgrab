import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const FLOWS = [
  {
    anim: "dashboard",
    title: "Describe it. AI writes the issue.",
    desc: "Type what's broken, paste a screenshot, or both. AI generates the title, body, labels, and severity — your GitHub issue is ready before you finish your coffee.",
    tag: "AI-powered",
  },
  {
    anim: "autocapture",
    title: "Your app crashes? We catch it.",
    desc: "Add one line to your app. When something breaks in production, Glitchgrab captures everything — stack trace, what the user did, a screenshot — and files the issue for you. While you sleep.",
    tag: "Zero config",
  },
  {
    anim: "report",
    title: "Your users become QA testers.",
    desc: "A 'Report Bug' button in your app. Users tap it, we grab a screenshot + context, and a clean GitHub issue appears in your repo. No Slack messages. No vague emails. No 'it doesn't work'.",
    tag: "Built into SDK",
  },
  {
    anim: "dedup",
    title: "Same bug? Same issue.",
    desc: "10 users hit the same crash? You get 1 issue with 10 reports, not 10 issues cluttering your board. AI spots duplicates and merges them. Open source — see a bug in Glitchgrab? Fix it yourself.",
    tag: "Smart dedup",
  },
] as const;

const STEPS = [
  {
    num: "01",
    title: "Connect GitHub",
    desc: "OAuth in, pick a repo, get a token.",
  },
  {
    num: "02",
    title: "Drop in the SDK",
    desc: "One component in your layout. That's it.",
  },
  {
    num: "03",
    title: "Bugs become issues",
    desc: "AI writes the issue. Dedup prevents spam. GitHub gets a clean issue.",
  },
];


export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Glitchgrab"
              width={28}
              height={28}
              className="rounded-full sm:w-8 sm:h-8"
            />
            <span className="font-semibold text-base sm:text-lg tracking-tight">
              glitchgrab
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#waitlist">
              <Button size="sm">Join Waitlist</Button>
            </a>
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
                Turn messy bug reports — screenshots, production errors, user
                complaints — into well-structured GitHub issues. Powered by AI.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm sm:mt-8 lg:justify-start">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-primary">&#9889;</span> Ship fixes
                  faster
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-primary">&#128337;</span> Save hours on
                  triage
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-primary">&#9881;&#65039;</span> Zero
                  config SDK
                </span>
              </div>

              <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center lg:justify-start sm:gap-4">
                <a href="#waitlist">
                  <Button size="lg" className="w-full sm:w-auto">
                    Join the Waitlist
                  </Button>
                </a>
                <a href="#how-it-works">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    See how it works
                  </Button>
                </a>
              </div>
            </div>

            {/* Right — live terminal demo */}
            <div className="flex-1 w-full max-w-lg">
              <HeroTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* Features + Video */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center mb-12 sm:mb-20">
          <Badge variant="outline" className="mb-4 gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            How it works
          </Badge>
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
            Stop writing issues.{" "}
            <span className="text-primary">Start shipping fixes.</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto sm:mt-4 sm:text-base leading-relaxed">
            Crashes, screenshots, user complaints — doesn&apos;t matter how the
            bug reaches you. Glitchgrab turns it into a clean GitHub issue. One
            click. Or zero.
          </p>
        </div>

        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-12">
          {/* Left — compact 2x2 grid */}
          <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 max-w-2xl">
            {FLOWS.map((flow, i) => (
              <Card
                key={flow.title}
                className="group transition hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary font-mono">
                      {i + 1}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-primary bg-primary/10 text-[10px]"
                    >
                      {flow.tag}
                    </Badge>
                  </div>
                  <div className="mb-3">
                    <div className="inline-block rounded-lg bg-primary/5 p-1.5 ring-1 ring-primary/10 group-hover:ring-primary/20 transition">
                      {flow.anim === "dashboard" && <DashboardChatAnim />}
                      {flow.anim === "autocapture" && <AutoCaptureAnim />}
                      {flow.anim === "report" && <ReportButtonAnim />}
                      {flow.anim === "dedup" && <DedupAnim />}
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold mb-1 sm:text-base">
                    {flow.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed sm:text-sm">
                    {flow.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Right — sticky video */}
          <div className="lg:sticky lg:top-24 shrink-0">
            <HeroVideo src="https://cdn.glitchgrab.dev/meta/Timeline.mp4" />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24"
      >
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
            Stupid simple setup
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Three steps. Under five minutes.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step) => (
            <div key={step.num} className="relative">
              <span className="text-4xl font-bold text-primary/10 font-mono sm:text-6xl">
                {step.num}
              </span>
              <h3 className="mt-1 text-lg font-semibold sm:mt-2 sm:text-xl">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground sm:mt-2">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Pipeline */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
            AI does the heavy lifting
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto sm:mt-4 sm:text-base">
            Not AI-assisted. AI-generated. The full issue — title, description,
            labels, severity — written from raw input.
          </p>
        </div>

        <Card>
          <CardContent className="p-5 sm:p-12">
            <div className="flex flex-col gap-4 sm:gap-6">
              {[
                {
                  label: "Normalize",
                  desc: "Image, text, or error → standard format",
                },
                {
                  label: "Enrich",
                  desc: "Pull repo context — existing issues, labels",
                },
                { label: "Dedup", desc: "Check if this bug already exists" },
                { label: "Generate", desc: "AI writes the complete issue" },
                {
                  label: "Push",
                  desc: "Create GitHub issue + attach screenshots",
                },
              ].map((step, i) => (
                <div
                  key={step.label}
                  className="flex items-start gap-3 sm:gap-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold sm:h-10 sm:w-10 sm:text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base">
                      {step.label}
                    </h4>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-border bg-background p-3 text-center sm:mt-8 sm:p-4">
              <p className="text-xs text-muted-foreground sm:text-sm">
                AI-powered issue generation built in. No API keys, no setup.
                <br />
                <span className="text-primary">Just connect and ship.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
            Got questions? <span className="text-primary">Talk to us.</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Feature request, feedback, partnership — we read every message.
          </p>
        </div>

        <Card>
          <CardContent className="p-5 sm:p-8">
            <ContactForm />
          </CardContent>
        </Card>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
            Simple pricing
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
            One plan. No surprises. 7-day free trial. Cancel anytime.
          </p>
        </div>

        <div className="mx-auto max-w-md">
          <Card className="border-2 border-primary overflow-visible relative">
            <CardContent className="p-5 pt-7 sm:p-8 sm:pt-8">
              <Badge className="absolute -top-2.5 left-4 sm:left-auto sm:right-6 sm:-top-3 z-10">
                7-day free trial
              </Badge>
              <h3 className="text-lg font-semibold">Glitchgrab Pro</h3>
              <div className="mt-3 flex items-baseline gap-1 sm:mt-4">
                <span className="text-3xl font-bold text-primary sm:text-4xl">
                  &#8377;199
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
                AI-powered bug capture — zero setup
              </p>
              <ul className="mt-6 space-y-2.5 text-xs sm:mt-8 sm:space-y-3 sm:text-sm">
                {[
                  "Unlimited repos",
                  "100 issues created/mo",
                  "Smart dedup & updates (free)",
                  "SDK auto-capture",
                  "Screenshot analysis",
                  "AI built in — zero setup",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-primary">&#10003;</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Waitlist */}
      <section
        id="waitlist"
        className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24"
      >
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 text-center sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
              Get early access
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto sm:mt-4">
              We&apos;re building Glitchgrab in public. Join the waitlist to get
              early access, shape the product, and lock in launch pricing.
            </p>

            <WaitlistForm />

            <p className="mt-3 text-xs text-muted-foreground sm:mt-4">
              No spam. Just launch updates.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-12 pb-8 sm:pt-16 sm:pb-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Image
                  src="/logo.png"
                  alt="Glitchgrab"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="text-sm font-semibold">glitchgrab</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-50">
                Turn messy bugs into clean GitHub issues. Powered by AI.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Product
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#how-it-works"
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <Link
                    href="/changelog"
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    Changelog
                  </Link>
                </li>
                <li>
                  <a
                    href="#waitlist"
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    Join Waitlist
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Resources
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://github.com/webnaresh/glitchgrab"
                    target="_blank"
                    rel="noopener"
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.npmjs.com/package/glitchgrab"
                    target="_blank"
                    rel="noopener"
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    npm Package
                  </a>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Legal
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/refund"
                    className="text-muted-foreground hover:text-primary transition"
                  >
                    Refund Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center gap-2 border-t border-border pt-6 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Navibyte Innovation Pvt. Ltd.
              All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Open source under{" "}
              <a
                href="https://github.com/webnaresh/glitchgrab/blob/main/LICENSE"
                target="_blank"
                rel="noopener"
                className="text-primary hover:underline"
              >
                MIT License
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
