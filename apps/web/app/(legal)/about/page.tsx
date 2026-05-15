import type { Metadata } from "next";
import Link from "next/link";
import { Github, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Glitchgrab is an open-source AI bug capture tool built by Navibyte Innovations. Learn who built it, why, and what we're working toward.",
  alternates: {
    canonical: "https://glitchgrab.dev/about",
  },
};

export default function AboutPage() {
  return (
    <article className="space-y-10">
      <header>
        <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">
          <span className="text-primary">/</span> about
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          About Glitchgrab
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          An open-source tool that turns messy bug inputs into structured GitHub
          issues — so developers spend less time on triage and more time
          shipping.
        </p>
      </header>

      {/* What it is */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          What is Glitchgrab?
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Glitchgrab is a drop-in Next.js SDK that automatically captures
          production errors, processes user-submitted screenshots and vague bug
          reports, and creates well-structured GitHub issues using AI. It
          handles the full pipeline: normalize the input, enrich it with repo
          context, deduplicate against open issues, generate a markdown issue,
          and push it to GitHub — all without manual triage.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          It supports Next.js 13, 14, and 15. Installation is a single package
          and one provider component. The free tier is unlimited — one GitHub
          repository, unlimited reports, forever.
        </p>
      </section>

      {/* Who built it */}
      <section className="space-y-3 border-l-2 border-primary pl-5">
        <h2 className="text-xl font-semibold tracking-tight">
          Who built this?
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Glitchgrab is built and maintained by{" "}
          <strong className="text-foreground">Naresh Bhosale</strong>, founder
          of{" "}
          <strong className="text-foreground">
            Navibyte Innovations Pvt. Ltd.
          </strong>{" "}
          — a software company focused on developer tooling and open-source
          infrastructure.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Naresh is a full-stack developer with hands-on experience building
          production Next.js applications. Glitchgrab started as an internal
          tool to solve a real problem: too much developer time was being lost
          to manual bug triage, duplicate issues, and vague user reports that
          contained no actionable context.
        </p>
      </section>

      {/* Why */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Why we built it
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Every engineering team faces the same cycle: a user reports something
          is broken, the developer asks for more context, the user sends a
          screenshot of a white screen, and the issue sits unresolved while the
          developer tries to reproduce it from scratch. Meanwhile, three other
          users have reported the same error in different words, creating three
          duplicate issues.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Glitchgrab was built to break that cycle. By capturing errors
          automatically with full context — stack trace, DOM state, recent
          network requests, breadcrumbs — and using AI to generate a properly
          structured GitHub issue, the triage step is eliminated entirely.
          Semantic deduplication means 50 users hitting the same bug creates
          one issue, not 50.
        </p>
      </section>

      {/* Open source */}
      <section className="space-y-3 bg-card border border-border rounded-md p-6">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Github className="h-5 w-5" />
          Open source
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Glitchgrab is fully open source under the MIT license. The SDK, web
          dashboard, mobile app, and MCP server are all public. Contributions,
          bug reports, and feature requests are welcome on GitHub.
        </p>
        <a
          href="https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline mt-1"
        >
          <Github className="h-4 w-4" />
          github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </section>

      {/* Contact */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Get in touch</h2>
        <p className="text-muted-foreground leading-relaxed">
          For questions, partnership inquiries, or feedback, reach out via the
          contact page or open an issue on GitHub. Response time is within 48
          hours.
        </p>
        <div className="flex gap-4 font-mono text-sm">
          <Link
            href="/contact"
            className="text-primary hover:underline flex items-center gap-1"
          >
            Contact page <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </article>
  );
}
