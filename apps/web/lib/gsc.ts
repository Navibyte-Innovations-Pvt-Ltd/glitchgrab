const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GscTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface GscInspectResult {
  indexed: boolean;
  reason?: string;
}

export interface GscIndexingResult {
  notifyTime: string;
}

/**
 * Exchange an OAuth authorization code for access/refresh tokens.
 */
export async function exchangeGscCode(
  code: string,
  redirectUri: string
): Promise<GscTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC token exchange failed: ${err}`);
  }

  return res.json() as Promise<GscTokenResponse>;
}

/**
 * Refresh an expired access token using a refresh token.
 */
export async function refreshGscToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC token refresh failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return data;
}

/**
 * List all GSC properties accessible by the given access token.
 */
export async function listGscSites(accessToken: string): Promise<GscSite[]> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC list sites failed: ${err}`);
  }

  const data = (await res.json()) as { siteEntry?: GscSite[] };
  return data.siteEntry ?? [];
}

/**
 * Fetch sitemap index URLs for a GSC property.
 */
export async function getSitemapUrls(
  accessToken: string,
  siteUrl: string
): Promise<string[]> {
  const encoded = encodeURIComponent(siteUrl);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encoded}/sitemaps`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC sitemaps fetch failed: ${err}`);
  }

  const data = (await res.json()) as {
    sitemap?: Array<{ path: string; contents?: Array<{ type: string; submitted: number }> }>;
  };

  return (data.sitemap ?? []).map((s) => s.path);
}

/**
 * Inspect a URL's indexing status via the URL Inspection API.
 */
export async function inspectUrl(
  accessToken: string,
  siteUrl: string,
  url: string
): Promise<GscInspectResult> {
  const res = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC URL inspection failed for ${url}: ${err}`);
  }

  const data = (await res.json()) as {
    inspectionResult?: {
      indexStatusResult?: {
        coverageState?: string;
        verdict?: string;
      };
    };
  };

  const coverageState = data.inspectionResult?.indexStatusResult?.coverageState ?? "";
  const verdict = data.inspectionResult?.indexStatusResult?.verdict ?? "";

  const indexed = verdict === "PASS";
  const reason = indexed ? undefined : coverageState || undefined;

  return { indexed, reason };
}

/**
 * Submit a URL to the Google Indexing API for re-crawl.
 */
export async function requestIndexing(
  accessToken: string,
  url: string
): Promise<GscIndexingResult> {
  const res = await fetch(
    "https://indexing.googleapis.com/v3/urlNotifications:publish",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type: "URL_UPDATED" }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC indexing request failed for ${url}: ${err}`);
  }

  const data = (await res.json()) as { urlNotificationMetadata?: { latestUpdate?: { notifyTime?: string } } };
  return { notifyTime: data.urlNotificationMetadata?.latestUpdate?.notifyTime ?? new Date().toISOString() };
}
