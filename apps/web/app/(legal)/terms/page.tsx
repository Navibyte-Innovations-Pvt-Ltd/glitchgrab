import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Glitchgrab",
  description:
    "Terms and conditions for using Glitchgrab.",
  alternates: {
    canonical: "https://glitchgrab.dev/terms",
  },
};

export default function TermsOfServicePage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: March 2026
        </p>
      </header>

      <p className="text-muted-foreground leading-relaxed">
        These Terms of Service (&quot;Terms&quot;) govern your use of Glitchgrab,
        operated by Naresh, an individual developer. By using Glitchgrab, you
        agree to these Terms. If you do not agree, do not use the service.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Service Description</h2>
        <p className="text-muted-foreground leading-relaxed">
          Glitchgrab is a SaaS tool that converts bug reports — including
          screenshots, production errors, and user-reported
          bugs — into well-structured GitHub issues using AI. The service
          includes a web dashboard, an npm SDK for Next.js applications, and an
          MCP server.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Account Terms</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            You must sign in with a valid GitHub account to use Glitchgrab.
          </li>
          <li>
            You are responsible for maintaining the security of your account and
            API tokens.
          </li>
          <li>
            You must not share your API tokens with unauthorized parties. Tokens
            that are compromised should be revoked immediately through the
            dashboard.
          </li>
          <li>
            You must be at least 16 years of age to use the service.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Payment &amp; Billing</h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            Glitchgrab offers a paid plan:{" "}
            <strong className="text-foreground">Pro at ₹199/month</strong>
            .
          </li>
          <li>
            All payments are billed monthly and processed securely through
            Razorpay.
          </li>
          <li>
            Prices are listed in USD. Applicable taxes may apply depending on
            your location.
          </li>
          <li>
            We reserve the right to change pricing with 30 days&apos; notice.
            Existing subscribers will be notified via email before any price
            change takes effect.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          4. Cancellation &amp; Refunds
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            You may cancel your subscription at any time from the dashboard.
          </li>
          <li>
            Upon cancellation, your subscription remains active until the end of
            the current billing period.
          </li>
          <li>
            We offer a 7-day money-back guarantee for new subscriptions. See our{" "}
            <a href="/refund" className="text-primary hover:underline">
              Refund Policy
            </a>{" "}
            for details.
          </li>
          <li>
            No refunds are issued after the 7-day period.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Acceptable Use</h2>
        <p className="text-muted-foreground leading-relaxed">
          You agree not to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            Use Glitchgrab to create spam, abusive, or misleading GitHub issues.
          </li>
          <li>
            Attempt to reverse-engineer, disassemble, or tamper with the
            service.
          </li>
          <li>
            Exceed rate limits or use automated tools to abuse the API.
          </li>
          <li>
            Upload content that is illegal, harmful, or violates third-party
            rights.
          </li>
          <li>
            Share, resell, or redistribute your account access to unauthorized
            users.
          </li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">
          We reserve the right to suspend or terminate accounts that violate
          these terms without prior notice.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
        <p className="text-muted-foreground leading-relaxed">
          Glitchgrab&apos;s source code is open source and available on GitHub.
          You retain ownership of all data you submit through the service,
          including error reports, screenshots, and generated issues. We do not
          claim ownership of your content.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Service Availability</h2>
        <p className="text-muted-foreground leading-relaxed">
          We strive to keep Glitchgrab available at all times but do not
          guarantee 100% uptime. The service may be temporarily unavailable due
          to maintenance, updates, or circumstances beyond our control.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
        <p className="text-muted-foreground leading-relaxed">
          Glitchgrab is provided &quot;as is&quot; without warranties of any
          kind, express or implied. To the maximum extent permitted by law, we
          shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, including but not limited to loss
          of data, revenue, or profits, arising from your use of the service.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Our total liability for any claim related to the service shall not
          exceed the amount you paid us in the 12 months preceding the claim.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">9. Changes to These Terms</h2>
        <p className="text-muted-foreground leading-relaxed">
          We may update these Terms from time to time. We will notify you of
          significant changes by posting a notice on our website or sending an
          email. Continued use of the service after changes constitutes
          acceptance of the updated Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">10. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you have questions about these Terms, contact us at{" "}
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
