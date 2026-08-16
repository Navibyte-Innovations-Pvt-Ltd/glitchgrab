/**
 * Seed the bot's Google session — run this ONCE, locally, by hand.
 *
 *   bun run seed-auth
 *
 * Opens a real Chrome window. You sign in as the bot's account (e.g.
 * notetaker@yourdomain.com), press Enter here, and it prints a base64 blob to
 * paste into Railway as GOOGLE_STORAGE_STATE.
 *
 * Why a human does this instead of the bot:
 * Google's bot detection exists specifically to catch automated logins. Driving
 * the sign-in form from Playwright triggers CAPTCHAs and device challenges and
 * breaks unpredictably. A real login in a real browser, captured once, avoids
 * that entire class of failure — the bot only ever *replays* a session a human
 * already established.
 *
 * The output is a live credential. Treat it like a password: it grants access
 * to that Google account. Use a dedicated account, never a personal one.
 */

import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";

const OUT_FILE = "google-state.json";

async function main() {
  console.log("\nOpening Chrome…\n");

  // channel: "chrome" uses the Chrome you already have installed rather than a
  // downloaded Chromium — it looks like a normal browser to Google, which is
  // the entire point of doing this step by hand.
  const browser = await chromium.launch({ headless: false, channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://accounts.google.com/");

  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│ 1. Sign in as the BOT's Google account (not your personal). │");
  console.log("│ 2. Finish any 2FA / device verification.                    │");
  console.log("│ 3. Open https://meet.google.com once to warm the session.   │");
  console.log("│ 4. Come back here and press Enter.                          │");
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  const state = await context.storageState();
  await browser.close();

  const json = JSON.stringify(state);
  await writeFile(OUT_FILE, json, "utf8");

  const base64 = Buffer.from(json, "utf8").toString("base64");

  console.log(`\nSaved ${OUT_FILE} (${(json.length / 1024).toFixed(1)} KB)`);
  console.log(`Cookies captured: ${(state.cookies ?? []).length}\n`);
  console.log("Set this on the Railway service as GOOGLE_STORAGE_STATE:\n");
  console.log(base64);
  console.log(
    "\n⚠  This is a live credential — it signs in as that account. Do not commit it.\n"
  );
}

main().catch((err) => {
  console.error("seed-auth failed:", err);
  process.exit(1);
});
