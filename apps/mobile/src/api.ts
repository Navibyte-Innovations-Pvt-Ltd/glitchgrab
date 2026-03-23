const BASE_URL = __DEV__
  ? "http://192.168.1.3:3000"
  : "https://glitchgrab.dev";

export { BASE_URL };

/**
 * Exchange a GitHub OAuth access token for a Glitchgrab session token.
 * Calls our backend which creates/finds the user and returns a JWT.
 */
export async function exchangeCodeForSession(
  githubAccessToken: string
): Promise<{ sessionToken: string; user: { name: string; email: string; image: string } }> {
  const res = await fetch(`${BASE_URL}/api/auth/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: githubAccessToken }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "Unknown error");
    throw new Error(`Auth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.success || !data.sessionToken) {
    throw new Error(data.error || "Invalid response from server");
  }

  return {
    sessionToken: data.sessionToken,
    user: data.user,
  };
}

/**
 * Exchange a GitHub OAuth authorization code for an access token.
 * This calls GitHub's token endpoint directly.
 */
export async function exchangeCodeForAccessToken(
  code: string
): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: "Ov23li297WDZdxlPvK9y",
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed (${res.status})`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}
