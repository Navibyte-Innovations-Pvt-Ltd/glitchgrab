export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";

/**
 * The page a client opens to connect their own Google Calendar.
 *
 * No Glitchgrab account, no login, no dashboard — they arrive from a link
 * someone sent them, see plainly what is about to happen, and sign in with
 * their own Google. Everything on this page is written for a person who has
 * never heard of us and is being asked for access to their calendar.
 */
export default async function CalendarConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;

  const invite = await prisma.calendarInvite.findUnique({
    where: { id: token },
    select: {
      label: true,
      usedAt: true,
      expiresAt: true,
      repo: { select: { name: true } },
    },
  });

  const project = invite?.repo.name ?? invite?.label ?? "this project";

  if (done && invite?.usedAt) {
    return (
      <Shell title="Calendar connected">
        <p>
          Thank you — your Google Calendar is now connected for{" "}
          <strong className="text-foreground">{project}</strong>.
        </p>
        <p>
          Demo bookings will appear in your calendar with a Google Meet link, and only times you
          are free will ever be offered. You can close this page.
        </p>
        <p className="text-xs">
          To disconnect at any time, remove Glitchgrab from your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Google account permissions
          </a>
          .
        </p>
      </Shell>
    );
  }

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return (
      <Shell title="This link is no longer valid">
        <p>
          It has already been used, or it has expired. Links last 7 days and work once — ask
          whoever sent it for a fresh one.
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="Connect your Google Calendar">
      <p>
        You have been asked to connect your Google Calendar so demos for{" "}
        <strong className="text-foreground">{project}</strong> can be scheduled in it.
      </p>

      <div className="border border-border rounded-md p-4 space-y-2 text-xs">
        <div className="font-medium text-foreground">What this allows</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Reading when you are busy, so only free times are ever offered</li>
          <li>Creating a calendar event, with a Google Meet link, when someone books a demo</li>
        </ul>
        <div className="font-medium text-foreground pt-2">What it does not allow</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Changing or deleting anything Glitchgrab did not create</li>
          <li>Reading the contents of your other meetings</li>
          <li>Access to your email, contacts, or files</li>
        </ul>
      </div>

      <a
        href={`/api/v1/calendar/auth?invite=${token}`}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-mono text-sm px-4 py-2.5 rounded-md hover:opacity-90 transition-opacity"
      >
        Continue with Google
      </a>

      <p className="text-xs">
        Google will warn that this app is not verified — that review is in progress. You can
        disconnect at any time from your{" "}
        <a
          href="https://myaccount.google.com/permissions"
          className="text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Google account permissions
        </a>
        .
      </p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-4 text-sm text-muted-foreground leading-relaxed">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {children}
      </div>
    </main>
  );
}
