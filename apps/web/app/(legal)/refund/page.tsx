import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy — Glitchgrab",
  description:
    "Glitchgrab refund policy and money-back guarantee details.",
};

export default function RefundPolicyPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Refund Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: March 2026
        </p>
      </header>

      <p className="text-muted-foreground leading-relaxed">
        We want you to be satisfied with Glitchgrab. If it&apos;s not the right
        fit, we offer a straightforward refund policy.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7-Day Money-Back Guarantee</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you are not satisfied with Glitchgrab, you can request a full refund
          within <strong className="text-foreground">7 days</strong> of your
          first payment. This applies to both the Pro (BYOK) plan at $5/month
          and the Pro (Platform AI) plan at $10/month.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How to Request a Refund</h2>
        <p className="text-muted-foreground leading-relaxed">
          To request a refund, send an email to{" "}
          <a
            href="mailto:bhosalenaresh73@gmail.com"
            className="text-primary hover:underline"
          >
            bhosalenaresh73@gmail.com
          </a>{" "}
          with the following details:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Your account email address</li>
          <li>The reason for the refund (optional, but helps us improve)</li>
          <li>Your payment date</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Processing Time</h2>
        <p className="text-muted-foreground leading-relaxed">
          Refund requests are reviewed within{" "}
          <strong className="text-foreground">3-5 business days</strong>. Once
          approved, the refund will be processed through Razorpay and credited
          back to your original payment method within 5-10 business days,
          depending on your bank.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">After the 7-Day Period</h2>
        <p className="text-muted-foreground leading-relaxed">
          Refunds are not available after the 7-day guarantee period. You can
          cancel your subscription at any time from the dashboard, and your
          access will continue until the end of your current billing cycle. No
          partial refunds are issued for unused time within a billing period.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Exceptions</h2>
        <p className="text-muted-foreground leading-relaxed">
          If you experience a service outage or critical bug that prevents you
          from using Glitchgrab, we may offer a refund or credit at our
          discretion, regardless of the 7-day window. Contact us and we will
          work with you to find a fair resolution.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          For refund requests or billing questions, email us at{" "}
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
