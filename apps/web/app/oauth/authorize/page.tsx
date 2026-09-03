import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { visibleRepoWhere } from "@/lib/mcp-oauth";
import { approveAuthorization, denyAuthorization } from "./actions";

export const dynamic = "force-dynamic";

/**
 * The consent screen — the only part of the OAuth flow a human sees.
 *
 * Not signed in? Straight to /login with a callback back here, so the whole
 * thing stays one browser trip: click connect in the agent, log in if needed,
 * approve, done.
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";

  const clientId = get("client_id");
  const redirectUri = get("redirect_uri");
  const responseType = get("response_type");
  const codeChallenge = get("code_challenge");
  const codeChallengeMethod = get("code_challenge_method") || "S256";
  const state = get("state");
  const resource = get("resource");
  const scope = get("scope") || "mcp";

  const session = await auth();
  if (!session?.user?.id) {
    const self = new URL("https://placeholder.invalid/oauth/authorize");
    Object.entries(sp).forEach(([k, v]) => {
      if (typeof v === "string") self.searchParams.set(k, v);
    });
    redirect(`/login?callbackUrl=${encodeURIComponent(`/oauth/authorize${self.search}`)}`);
  }

  const client = clientId
    ? await prisma.oAuthClient.findUnique({
        where: { clientId },
        select: { clientName: true, redirectUris: true },
      })
    : null;

  // Anything wrong with the client or the redirect is shown here rather than
  // bounced back: redirecting to an unvalidated URI is the open-redirect bug.
  const problem =
    !client
      ? "That application is not registered with Glitchgrab."
      : !client.redirectUris.includes(redirectUri)
        ? "The redirect address does not match what the application registered."
        : responseType !== "code"
          ? "Only the authorization code flow is supported."
          : !codeChallenge || codeChallengeMethod !== "S256"
            ? "This application did not send a valid PKCE challenge."
            : null;

  if (problem) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-xl font-semibold">Can&apos;t connect</h1>
        <p className="text-sm text-muted-foreground">{problem}</p>
        <p className="text-xs text-muted-foreground">
          Nothing was shared. You can close this tab.
        </p>
      </main>
    );
  }

  // Same predicate the tools enforce, so the screen never promises more or
  // less access than the grant actually carries.
  const repoCount = await prisma.repo.count({ where: visibleRepoWhere(session.user.id) });
  const appName = client?.clientName?.trim() || "An application";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Connect {appName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {session.user.email}
        </p>

        <p className="mt-6 text-sm">{appName} will be able to:</p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• See your {repoCount === 1 ? "connected repo" : `${repoCount} connected repos`} and their bug reports</li>
          <li>• Upload images to your Glitchgrab file storage</li>
          <li>• Comment on issues in those repos, as the Glitchgrab app</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          It cannot close issues, push code, or change your account. You can
          revoke this any time from Settings.
        </p>

        <form className="mt-6 flex gap-3">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="state" value={state} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />
          <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />
          <input type="hidden" name="resource" value={resource} />
          <input type="hidden" name="scope" value={scope} />

          <button
            type="submit"
            formAction={denyAuthorization}
            className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            formAction={approveAuthorization}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Approve
          </button>
        </form>
      </div>
    </main>
  );
}
