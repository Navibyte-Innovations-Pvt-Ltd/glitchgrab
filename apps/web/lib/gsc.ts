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
  reason?: string;       // human-readable coverageState from GSC
  verdict?: string;      // raw verdict: PASS | FAIL | NEUTRAL | EXCLUDED
  robotsTxtState?: string;
  indexingState?: string;
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
 * Parse <loc> URLs from a sitemap XML string.
 * Handles both regular sitemaps and sitemap index files.
 * Returns sitemap URLs found in index files (for recursive fetch) separately.
 */
function parseSitemapXml(xml: string): { pageUrls: string[]; childSitemapUrls: string[] } {
  const pageUrls: string[] = [];
  const childSitemapUrls: string[] = [];

  // Sitemap index — contains <sitemap><loc>…</loc></sitemap>
  const isIndex = /<sitemapindex/i.test(xml);
  if (isIndex) {
    const matches = xml.matchAll(/<sitemap[^>]*>[\s\S]*?<loc[^>]*>([\s\S]*?)<\/loc>/gi);
    for (const m of matches) childSitemapUrls.push(m[1].trim());
  } else {
    const matches = xml.matchAll(/<url[^>]*>[\s\S]*?<loc[^>]*>([\s\S]*?)<\/loc>/gi);
    for (const m of matches) pageUrls.push(m[1].trim());
  }

  return { pageUrls, childSitemapUrls };
}

async function fetchSitemapXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Fetch all page URLs from a site's registered GSC sitemaps.
 * Resolves sitemap index files one level deep.
 */
export async function getSitemapUrls(
  accessToken: string,
  siteUrl: string,
  maxUrls = 500
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
    sitemap?: Array<{ path: string }>;
  };

  const sitemapPaths = (data.sitemap ?? []).map((s) => s.path);
  if (sitemapPaths.length === 0) return [];

  const allPageUrls: string[] = [];

  for (const sitemapUrl of sitemapPaths) {
    if (allPageUrls.length >= maxUrls) break;

    const xml = await fetchSitemapXml(sitemapUrl);
    if (!xml) continue;

    const { pageUrls, childSitemapUrls } = parseSitemapXml(xml);

    if (pageUrls.length > 0) {
      allPageUrls.push(...pageUrls);
    } else {
      // Sitemap index — fetch child sitemaps
      for (const childUrl of childSitemapUrls) {
        if (allPageUrls.length >= maxUrls) break;
        const childXml = await fetchSitemapXml(childUrl);
        if (!childXml) continue;
        const { pageUrls: childPages } = parseSitemapXml(childXml);
        allPageUrls.push(...childPages);
      }
    }
  }

  // Dedupe and exclude sitemap files themselves
  const seen = new Set<string>();
  return allPageUrls.filter((u) => {
    if (seen.has(u) || /sitemap/i.test(u)) return false;
    seen.add(u);
    return true;
  }).slice(0, maxUrls);
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
        robotsTxtState?: string;
        indexingState?: string;
      };
    };
  };

  const result = data.inspectionResult?.indexStatusResult ?? {};
  const verdict = result.verdict ?? "";
  const indexed = verdict === "PASS";

  return {
    indexed,
    reason: indexed ? undefined : (result.coverageState || undefined),
    verdict,
    robotsTxtState: result.robotsTxtState,
    indexingState: result.indexingState,
  };
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
