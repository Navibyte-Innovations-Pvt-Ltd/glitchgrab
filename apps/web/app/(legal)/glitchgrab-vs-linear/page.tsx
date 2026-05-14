import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Glitchgrab vs Linear",
  description:
    "Comparing Glitchgrab and Linear for bug tracking in Next.js teams. Glitchgrab auto-creates GitHub issues with AI from crashes and screenshots. Linear is a project management tool. See the difference.",
  alternates: {
    canonical: "https://glitchgrab.dev/glitchgrab-vs-linear",
  },
};

const BREADCRUMBS = [
  { name: "Home", url: "https://glitchgrab.dev" },
  { name: "Glitchgrab vs Linear", url: "https://glitchgrab.dev/glitchgrab-vs-linear" },
];

export default function GlitchgrabVsLinearPage() {
  return (
    <>
      <BreadcrumbJsonLd items={BREADCRUMBS} />
      <article className="space-y-10">
        <header>
          <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">
            <span className="text-primary">/</span> compare
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Glitchgrab vs Linear
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Linear is a project management tool. Glitchgrab is a bug capture
            tool. They operate at different layers of the engineering workflow —
            and for teams that use GitHub Issues, Glitchgrab is the more direct
            fit for bug triage.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            What does each tool do?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Linear</strong> is a modern
            project management and issue tracking tool. Teams use it to plan
            sprints, track work, manage priorities, and run cycles. Creating an
            issue in Linear is a deliberate act — someone writes a title,
            description, and priority. There is no automatic capture from
            production.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Glitchgrab</strong> is a bug
            capture tool built specifically for Next.js. It intercepts
            production errors, processes user screenshots and vague complaints,
            and uses AI to generate a structured GitHub issue — automatically,
            without a developer writing anything. The comparison is less
            "which is better" and more "which layer of the stack does each
            tool own."
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
                  <th className="px-4 py-3 font-semibold text-foreground">Linear</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Auto-capture production errors", true, false],
                  ["AI-generated issue titles and labels", true, false],
                  ["Semantic deduplication", true, false],
                  ["User-submitted bug reports via SDK", true, false],
                  ["Screenshot capture", true, false],
                  ["GitHub Issues integration", true, "partial"],
                  ["Sprint planning and cycles", false, true],
                  ["Roadmap and milestones", false, true],
                  ["Team workload management", false, true],
                  ["Priority and status workflows", false, true],
                  ["Open source (MIT)", true, false],
                  ["Free tier — unlimited reports", true, false],
                  ["Next.js 13/14/15 SDK", true, false],
                ].map(([feature, gg, linear], i) => (
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
                      {linear === true ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      ) : linear === "partial" ? (
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
            Can you use both Glitchgrab and Linear together?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Yes, but with a caveat: Glitchgrab creates GitHub Issues, not
            Linear issues. If your team manages all work in Linear, Glitchgrab
            does not integrate directly — issues land in GitHub first.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Teams that keep bugs in GitHub and use Linear for feature planning
            can run both side by side. Glitchgrab handles the automatic
            triage-to-GitHub pipeline; Linear handles broader sprint and
            roadmap management.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Which teams is Glitchgrab built for?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Glitchgrab is built for Next.js teams that use GitHub as their
            primary issue tracker. If your workflow is GitHub-native — pull
            requests, code reviews, and issues all in one place — Glitchgrab
            fits directly into that without adding another tool to manage.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            It is particularly useful for teams or solo developers who lose time
            to manual bug triage: copying stack traces, writing issue titles,
            deduplicating reports from multiple users. Glitchgrab automates
            that entire step.
          </p>
        </section>

        <section className="space-y-3 bg-card border border-border rounded-md p-6">
          <h2 className="text-xl font-semibold tracking-tight">
            How is pricing different?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Glitchgrab's free tier is unlimited — one GitHub repo, unlimited
            reports, forever. The Pro plan is ₹199/month.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Linear's free plan is limited to 250 issues. Paid plans start at
            $8/user/month. For a 5-person team, that is $40/month before
            hitting any limits.
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
            href="/glitchgrab-vs-sentry"
            className="text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 transition-colors"
          >
            Glitchgrab vs Sentry <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </article>
    </>
  );
}
