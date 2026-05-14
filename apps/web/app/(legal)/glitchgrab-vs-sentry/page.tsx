import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Glitchgrab vs Sentry",
  description:
    "Comparing Glitchgrab and Sentry for Next.js bug tracking. Glitchgrab auto-creates GitHub issues with AI. Sentry focuses on error monitoring. See which fits your workflow.",
  alternates: {
    canonical: "https://glitchgrab.dev/glitchgrab-vs-sentry",
  },
};

const BREADCRUMBS = [
  { name: "Home", url: "https://glitchgrab.dev" },
  { name: "Glitchgrab vs Sentry", url: "https://glitchgrab.dev/glitchgrab-vs-sentry" },
];

export default function GlitchgrabVsSentryPage() {
  return (
    <>
      <BreadcrumbJsonLd items={BREADCRUMBS} />
      <article className="space-y-10">
        <header>
          <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">
            <span className="text-primary">/</span> compare
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Glitchgrab vs Sentry
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Both tools help engineering teams deal with bugs — but they solve
            different problems. Sentry monitors and alerts. Glitchgrab captures,
            structures, and files. Here is what each is actually good at.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            What does each tool do?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Sentry</strong> is an
            observability platform. It captures runtime exceptions, surfaces
            stack traces in a dashboard, and sends alerts when error rates
            spike. It is purpose-built for monitoring — not for turning those
            errors into actionable GitHub issues.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Glitchgrab</strong> is a bug
            capture and triage tool. It takes four kinds of inputs — SDK
            auto-capture, user-submitted screenshots, developer chat, and
            handwritten notes — runs them through an AI pipeline, and creates a
            structured GitHub issue with title, body, labels, severity, and
            deduplication. The output lands directly in your repo.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Side-by-side comparison
          </h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full font-mono text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-card/60">
                  <th className="px-4 py-3 font-semibold text-foreground">Feature</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Glitchgrab</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Sentry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Auto-create GitHub issues", true, false],
                  ["AI-generated issue titles and labels", true, false],
                  ["Semantic deduplication", true, false],
                  ["User-submitted bug reports", true, false],
                  ["Screenshot capture", true, "partial"],
                  ["Error rate monitoring", false, true],
                  ["Real-time alerting", false, true],
                  ["Performance tracing", false, true],
                  ["Open source (MIT)", true, "partial"],
                  ["Free tier — unlimited reports", true, false],
                  ["Next.js 13/14/15 SDK", true, true],
                  ["Works without GitHub", false, true],
                ].map(([feature, gg, sentry], i) => (
                  <tr key={i} className="hover:bg-card/40 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground">{feature as string}</td>
                    <td className="px-4 py-2.5">
                      {gg === true ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      ) : gg === "partial" ? (
                        <span className="text-amber-400">partial</span>
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {sentry === true ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      ) : sentry === "partial" ? (
                        <span className="text-amber-400">partial</span>
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            When should you use Glitchgrab?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Glitchgrab fits teams that manage bugs through GitHub Issues. If
            your workflow is: something breaks → open a GitHub issue → assign
            it → fix it, Glitchgrab removes the manual middle step entirely.
            You get structured, deduplicated issues created automatically,
            whether the input was a production crash or a vague user complaint.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            It is also a strong fit for small teams and solo developers who
            cannot justify Sentry&apos;s cost but still need a reliable path from
            bug report to GitHub issue.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            When should you use Sentry?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Sentry is the right choice when you need observability: error
            rates, traces, performance metrics, session replay, and real-time
            alerting. If you are operating a high-traffic service and need to
            know about regressions before users report them, Sentry&apos;s monitoring
            infrastructure is mature and well-supported.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The two tools are not mutually exclusive. Some teams use Sentry for
            monitoring and Glitchgrab for issue creation — Sentry surfaces
            the signal, Glitchgrab structures it into a GitHub issue.
          </p>
        </section>

        <section className="space-y-3 bg-card border border-border rounded-md p-6">
          <h2 className="text-xl font-semibold tracking-tight">
            How is pricing different?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Glitchgrab&apos;s free tier includes one GitHub repository and unlimited
            reports, forever. The Pro plan is ₹199/month and adds multiple
            repositories and bring-your-own-key support for OpenAI or
            Anthropic.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Sentry&apos;s free tier is capped by event volume. Production workloads
            typically require a paid plan starting at $26/month.
          </p>
        </section>

        <div className="flex gap-4 font-mono text-sm">
          <Link
            href="/"
            className="text-primary hover:underline flex items-center gap-1"
          >
            Try Glitchgrab free <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/glitchgrab-vs-linear"
            className="text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 transition-colors"
          >
            Glitchgrab vs Linear <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </article>
    </>
  );
}
