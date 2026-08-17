/**
 * Convert cookies exported from a NORMAL browser into a Playwright session.
 *
 *   bun run cookies-to-state ~/Downloads/cookies.json
 *
 * Why this exists instead of `seed-auth`:
 * Google refuses to sign you in from a browser it can tell is automated —
 * "Couldn't sign you in / This browser or app may not be secure". That check
 * fires on the Playwright-launched browser no matter how it is configured, and
 * trying to defeat it is an arms race against the single hardest-defended page
 * Google operates.
 *
 * So we sidestep it entirely: sign in with your ordinary Chrome, where nothing
 * is unusual, and carry the resulting cookies across. The bot only ever
 * replays a session a real browser established.
 *
 * Everything here runs on your machine. The session never leaves it except
 * when you paste it into Railway yourself.
 */

import { readFile, writeFile } from "node:fs/promises";

const OUT_FILE = "google-state.json";
const B64_FILE = "google-state.b64";

/** Shape exported by Cookie-Editor / EditThisCookie and similar extensions. */
interface ExportedCookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  session?: boolean;
  sameSite?: string;
}

interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
}

/**
 * Browser extensions and Playwright disagree on this field's spelling, and a
 * wrong value makes Google drop the cookie silently — which looks exactly like
 * "the session didn't work" with no other clue.
 */
function normalizeSameSite(value: string | undefined): PlaywrightCookie["sameSite"] {
  switch ((value ?? "").toLowerCase()) {
    case "no_restriction":
    case "none":
      return "None";
    case "strict":
      return "Strict";
    default:
      return "Lax";
  }
}

/** Only Google's own cookies matter; anything else is noise from other tabs. */
function isGoogleCookie(domain: string): boolean {
  return /(^|\.)google\.com$/.test(domain.replace(/^\./, "")) || domain.includes("google.");
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: bun run cookies-to-state <exported-cookies.json>\n");
    process.exit(1);
  }

  const raw = await readFile(input, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("That file is not valid JSON. Export as JSON, not as a header string.");
    process.exit(1);
  }

  // Some extensions wrap the array in an object; accept either.
  const list: ExportedCookie[] = Array.isArray(parsed)
    ? (parsed as ExportedCookie[])
    : ((parsed as { cookies?: ExportedCookie[] }).cookies ?? []);

  if (list.length === 0) {
    console.error("No cookies found in that file.");
    process.exit(1);
  }

  const cookies: PlaywrightCookie[] = list
    .filter((c) => c.name && c.value && c.domain && isGoogleCookie(c.domain))
    .map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || "/",
      // Session cookies carry no expiry; -1 is Playwright's "session cookie".
      expires: c.session || !c.expirationDate ? -1 : Math.floor(c.expirationDate),
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure),
      sameSite: normalizeSameSite(c.sameSite),
    }));

  if (cookies.length === 0) {
    console.error("No google.com cookies in that file — export them from a Google tab.");
    process.exit(1);
  }

  // Verified the hard way: a set of only `__Secure-*` cookies is NOT enough.
  // Google redirects straight back to the sign-in page without the classic
  // trio, which are httpOnly and are exactly the ones a cookie exporter is
  // likely to omit. Requiring them turns a silent "you're signed out" on a
  // real call into a warning here, where it costs nothing to fix.
  const names = new Set(cookies.map((c) => c.name));
  const missing = ["SID", "HSID", "SSID"].filter((n) => !names.has(n));

  const state = { cookies, origins: [] as unknown[] };
  const json = JSON.stringify(state);
  await writeFile(OUT_FILE, json, "utf8");

  console.log(`\nConverted ${cookies.length} Google cookies → ${OUT_FILE}`);

  if (missing.length > 0) {
    console.warn(`\n⚠  Missing required sign-in cookies: ${missing.join(", ")}`);
    console.warn("   Without these the bot lands on Google's sign-in page and cannot join.\n");
    console.warn("   Fix: open https://mail.google.com as the bot account and confirm the");
    console.warn("   inbox loads, then export the cookies from THAT tab. If the exporter");
    console.warn("   has an 'include httpOnly' option, turn it on.\n");
    process.exitCode = 1;
  } else {
    console.log("Sign-in cookies look complete.\n");
  }

  // Written to a file rather than printed. A session blob on your terminal ends
  // up in scrollback, shell history and any transcript of this session — the
  // one place a live credential should never be is a log everybody can re-read.
  const base64 = Buffer.from(json, "utf8").toString("base64");
  await writeFile(B64_FILE, base64, "utf8");

  console.log(`Wrote ${B64_FILE} (${(base64.length / 1024).toFixed(1)} KB)\n`);
  console.log("Copy it to your clipboard, then paste into Railway as GOOGLE_STORAGE_STATE:\n");
  console.log(`   pbcopy < ${B64_FILE}\n`);
  console.log(
    `⚠  Live credential — signs in as that account. When Railway has it:\n   rm ${OUT_FILE} ${B64_FILE} cookie.json\n`
  );
}

main().catch((err) => {
  console.error("cookies-to-state failed:", err);
  process.exit(1);
});
