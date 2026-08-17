import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Help with the Glitchgrab Chrome extension, SDK, and call recording — setup, shortcuts, permissions, and how to get in touch.",
  alternates: {
    canonical: "https://glitchgrab.dev/support",
  },
};

/**
 * Support page.
 *
 * Required by the Chrome Web Store listing, which asks for a support URL and
 * shows it to anyone who installs the extension. Written for someone who has
 * just installed it and something is not working — the questions are the ones
 * that actually come up (nothing happens on the shortcut, no screenshot, the
 * bot never joined), not a feature tour.
 */
export default function SupportPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Support
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Help with the Chrome extension, the SDK, and call recording.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Get in touch</h2>
        <p className="text-muted-foreground leading-relaxed">
          The fastest route is a GitHub issue — Glitchgrab is open source, and
          bug reports land where the work happens.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            <strong className="text-foreground">Bugs and feature requests</strong>{" "}
            —{" "}
            <a
              href="https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/issues"
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab/issues
            </a>
          </li>
          <li>
            <strong className="text-foreground">Email</strong> —{" "}
            <a
              href="mailto:bhosalenaresh73@gmail.com"
              className="text-primary hover:underline"
            >
              bhosalenaresh73@gmail.com
            </a>
          </li>
        </ul>
        <p className="text-muted-foreground leading-relaxed">
          For anything involving a recorded call or a screenshot, please email
          rather than opening a public issue.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Getting started</h2>
        <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
          <li>
            Create a free account at{" "}
            <a href="https://glitchgrab.dev" className="text-primary hover:underline">
              glitchgrab.dev
            </a>{" "}
            and connect a GitHub repository.
          </li>
          <li>Install the extension from the Chrome Web Store.</li>
          <li>
            Open your Glitchgrab dashboard once in the same browser. The
            extension picks up your session automatically — there is nothing to
            paste and no separate login.
          </li>
          <li>
            Press <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">⌘⇧G</kbd>{" "}
            (or{" "}
            <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">
              Ctrl+Shift+G
            </kbd>
            ) on any page to file a bug.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Common problems</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-foreground">
              Nothing happens when I press the shortcut
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Reload the page. A content script installed after a tab was opened
              only starts working once that tab reloads. If the page you are on
              already uses the Glitchgrab SDK, the app&apos;s own report dialog
              opens instead — that is deliberate, so you never get two.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground">
              It says my session has expired
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Open your Glitchgrab dashboard once in the same browser and try
              again. The extension signs itself in from your existing browser
              session; it never asks for a password.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground">
              No screenshot is attached
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Chrome does not allow extensions to capture{" "}
              <code className="text-xs">chrome://</code> pages, the Web Store, or
              PDF viewers. You can still send the report, and attach an image by
              dragging it in or pasting with{" "}
              <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">⌘V</kbd>.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground">
              The recording bot never joined my call
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              The bot joins as a guest and usually has to be admitted — check
              for a knock in Google Meet. The Glitchgrab badge beside Meet&apos;s
              toolbar shows what the bot is actually doing, and says so when it
              is waiting to be let in.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-foreground">
              I recorded a call before deciding which project it belongs to
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Choose <strong className="text-foreground">No project yet</strong>{" "}
              when starting, then file it later from the badge during the call or
              from the Calls page afterwards. Filing only changes where the
              recording lands — the audio and transcript are untouched.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Privacy</h2>
        <p className="text-muted-foreground leading-relaxed">
          Screenshots are taken only when you press the shortcut — never in the
          background and never automatically. Call audio is recorded only on a
          call where you start it, and everyone present sees the bot join as a
          participant. Full detail is in our{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Uninstalling</h2>
        <p className="text-muted-foreground leading-relaxed">
          Right-click the Glitchgrab icon and choose{" "}
          <em>Remove from Chrome</em>. To delete the data you have already sent,
          email us and we will remove your account, reports, and recordings.
        </p>
      </section>
    </article>
  );
}
