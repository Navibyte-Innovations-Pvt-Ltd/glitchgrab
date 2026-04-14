import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Glitchgrab",
  description:
    "How Glitchgrab collects, uses, and protects your data.",
  alternates: {
    canonical: "https://glitchgrab.dev/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: March 2026
        </p>
      </header>

      <p className="text-muted-foreground leading-relaxed">
        Glitchgrab (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is operated
        by Naresh, an individual developer. This Privacy Policy explains how we
        collect, use, and protect your information when you use our service at{" "}
        <a
          href="https://glitchgrab.dev"
          className="text-primary hover:underline"
        >
          glitchgrab.dev
        </a>
        .
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Information We Collect</h2>
        <p className="text-muted-foreground leading-relaxed">
          We collect the following information when you use Glitchgrab:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            <strong className="text-foreground">Account information</strong> —
            your email address and GitHub profile details (name, username,
            avatar) provided via GitHub OAuth sign-in.
          </li>
          <li>
            <strong className="text-foreground">Error reports</strong> — stack
            traces, error messages, browser/device information, visited page
            URLs, and breadcrumbs sent by the Glitchgrab SDK from your
            application.
          </li>
          <li>
            <strong className="text-foreground">Screenshots</strong> —
            screenshots captured automatically by the SDK or uploaded manually
            through the dashboard.
          </li>
          <li>
            <strong className="text-foreground">Payment information</strong> —
            processed securely by Razorpay. We do not store your credit card or
            bank details.
          </li>
          <li>
            <strong className="text-foreground">Usage data</strong> — basic
            analytics such as pages visited and features used to improve the
            service.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. How We Use Your Data</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            To process error reports and create structured GitHub issues on your
            behalf.
          </li>
          <li>
            To provide AI-powered analysis of bug reports, screenshots, and
            screenshots.
          </li>
          <li>To manage your account and subscription.</li>
          <li>To send transactional emails (account confirmations, billing).</li>
          <li>To improve and maintain the service.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Third-Party Services</h2>
        <p className="text-muted-foreground leading-relaxed">
          We share data with the following third-party services only as needed to
          operate Glitchgrab:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            <strong className="text-foreground">GitHub</strong> — to
            authenticate your account and create issues in your repositories.
          </li>
          <li>
            <strong className="text-foreground">OpenAI / Anthropic</strong> — to
            analyze error reports and generate issue content. All AI processing
            uses platform-provided keys.
          </li>
          <li>
            <strong className="text-foreground">Razorpay</strong> — to process
            subscription payments securely.
          </li>
          <li>
            <strong className="text-foreground">Gmail SMTP</strong> — to send
            transactional emails.
          </li>
          <li>
            <strong className="text-foreground">Vercel</strong> — to host the
            application and store uploaded screenshots.
          </li>
          <li>
            <strong className="text-foreground">Neon</strong> — to host our
            PostgreSQL database.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Data Security</h2>
        <p className="text-muted-foreground leading-relaxed">
          We take reasonable measures to protect your data. API tokens are stored
          as SHA-256 hashes and never in plaintext. User-provided AI keys are
          encrypted with AES-256-GCM. All communication is encrypted via HTTPS.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Data Retention &amp; Deletion</h2>
        <p className="text-muted-foreground leading-relaxed">
          We retain your data for as long as your account is active. Error
          reports and associated screenshots are retained for 90 days unless you
          delete them earlier. If you delete your account, all your data
          (including reports, tokens, and settings) will be permanently removed
          within 30 days.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          To request data deletion, email us at{" "}
          <a
            href="mailto:bhosalenaresh73@gmail.com"
            className="text-primary hover:underline"
          >
            bhosalenaresh73@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          We use essential cookies for authentication and session management. We
          do not use third-party tracking cookies or advertising cookies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Changes to This Policy</h2>
        <p className="text-muted-foreground leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you
          of any significant changes by posting a notice on our website.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you have questions about this Privacy Policy, contact us at{" "}
          <a
            href="mailto:bhosalenaresh73@gmail.com"
            className="text-primary hover:underline"
          >
            bhosalenaresh73@gmail.com
          </a>
          .
        </p>
      </section>
    </article>
  );
}
