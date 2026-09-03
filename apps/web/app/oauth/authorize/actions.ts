"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { issueAuthorizationCode, isAcceptableResource, mcpResourceUri } from "@/lib/mcp-oauth";

/**
 * The approve/deny half of the consent screen.
 *
 * Two exported actions rather than one action reading a `decision` field: the
 * decision must NOT ride on the submit button's name/value, because React does
 * not reliably include the submitter's name/value in the FormData handed to a
 * Server Action. When it was written that way, `decision` arrived null, every
 * Approve was read as a deny, and the connector failed with `access_denied`
 * after a 303 — with nothing in the logs to say why.
 *
 * Everything security-relevant is re-read and re-validated here rather than
 * trusted from the form: a hidden field in a page the user was navigated to is
 * attacker-controlled input, not state.
 */
export async function approveAuthorization(formData: FormData) {
  return decide(formData, true);
}

export async function denyAuthorization(formData: FormData) {
  return decide(formData, false);
}

async function decide(formData: FormData, approved: boolean) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const codeChallengeMethod = String(formData.get("code_challenge_method") ?? "S256");
  const resource = String(formData.get("resource") ?? "");
  const scope = String(formData.get("scope") ?? "mcp");

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId },
    select: { redirectUris: true },
  });
  // Exact match, never a prefix: a prefix check is how an open redirect gets in.
  if (!client || !client.redirectUris.includes(redirectUri)) {
    redirect("/oauth/authorize/error?reason=redirect_uri");
  }

  const target = new URL(redirectUri);
  if (state) target.searchParams.set("state", state);

  if (!approved) {
    // Logged because an access_denied that the user did not intend is
    // indistinguishable from a real Cancel at the client end — that is exactly
    // how the submitter-name bug above stayed invisible.
    console.info("[oauth/authorize] denied by user", { clientId });
    target.searchParams.set("error", "access_denied");
    target.searchParams.set("error_description", "The user declined the request");
    redirect(target.toString());
  }

  if (codeChallengeMethod !== "S256" || codeChallenge.length < 43) {
    target.searchParams.set("error", "invalid_request");
    target.searchParams.set("error_description", "PKCE S256 is required");
    redirect(target.toString());
  }

  const code = await issueAuthorizationCode({
    clientId,
    userId: session.user.id,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    // Pin the audience to this server regardless of what the client asked for.
    resource: isAcceptableResource(resource) ? resource : mcpResourceUri(),
    scope,
  });

  console.info("[oauth/authorize] approved", { clientId, userId: session.user.id });
  target.searchParams.set("code", code);
  redirect(target.toString());
}
