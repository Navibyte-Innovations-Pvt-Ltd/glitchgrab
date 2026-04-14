import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Glitchgrab",
  description:
    "Get in touch with the Glitchgrab team.",
  alternates: {
    canonical: "https://glitchgrab.dev/contact",
  },
};

export default function ContactPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: March 2026
        </p>
      </header>

      <p className="text-muted-foreground leading-relaxed">
        Have a question, feedback, or need help? We would love to hear from you.
        Glitchgrab is built and maintained by Naresh, and your messages are read
        personally.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <h2 className="text-lg font-semibold">Email</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Best for support requests, billing questions, and refund inquiries.
          </p>
          <a
            href="mailto:bhosalenaresh73@gmail.com"
            className="inline-block text-primary hover:underline text-sm font-medium"
          >
            bhosalenaresh73@gmail.com
          </a>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <h2 className="text-lg font-semibold">GitHub</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Best for bug reports, feature requests, and open-source
            contributions.
          </p>
          <a
            href="https://github.com/WebNaresh/glitchgrab"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-primary hover:underline text-sm font-medium"
          >
            github.com/WebNaresh/glitchgrab
          </a>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Response Time</h2>
        <p className="text-muted-foreground leading-relaxed">
          We aim to respond to all inquiries within{" "}
          <strong className="text-foreground">48 hours</strong>. For urgent
          issues (e.g., service outages or billing errors), please include
          &quot;URGENT&quot; in your email subject line and we will prioritize
          your request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What to Include</h2>
        <p className="text-muted-foreground leading-relaxed">
          To help us assist you faster, please include:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Your account email address</li>
          <li>A clear description of your question or issue</li>
          <li>
            Screenshots or error messages, if applicable
          </li>
        </ul>
      </section>
    </article>
  );
}
