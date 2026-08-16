import { chromium, type Browser, type Page } from "playwright-core";

/**
 * Driving Google Meet as a guest (#311).
 *
 * Meet's DOM is obfuscated and changes without notice, so every selector here
 * is expressed as **accessible name / visible text** rather than class names —
 * those are what Google keeps stable for screen readers, and they survive UI
 * revisions that would break a CSS selector immediately.
 *
 * Everything is layered and forgiving: if a step's element is missing we log
 * and continue rather than abort, because Meet shows different pre-join screens
 * depending on the account, the meeting settings and the A/B bucket.
 */

export interface JoinOptions {
  meetUrl: string;
  botName: string;
  /** Give up if the host never admits us. */
  admitTimeoutMs: number;
  /** Hard ceiling so a forgotten call cannot record forever. */
  maxDurationMs: number;
  /**
   * Fired once the bot is knocking. This is the only state that needs a human:
   * someone has to press Admit inside Meet, and they won't if the dashboard
   * just shows a spinner.
   */
  onWaitingAdmit?: () => void;
}

export interface MeetSession {
  page: Page;
  browser: Browser;
  /** Resolves when the call ends (everyone left, we were removed, or the cap). */
  waitForEnd: () => Promise<"ended" | "max-duration">;
  leave: () => Promise<void>;
}

/**
 * Launch Chromium wired to the virtual sound card.
 *
 * The fake media device flags matter: without them Meet blocks on a camera and
 * microphone permission prompt that nobody is there to answer. The bot has no
 * real devices and publishes silence — it is there to listen, not to speak.
 */
export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      // Auto-accept the camera/mic permission prompt.
      "--use-fake-ui-for-media-stream",
      // Publish a synthetic (silent) camera and microphone.
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-blink-features=AutomationControlled",
    ],
  });
}

/**
 * Dump what the page actually shows.
 *
 * This bot drives an app we do not control, so when a step fails the only
 * useful question is "what was on screen?". Logging the URL, title and every
 * visible button name turns a blind failure into a fixable one — without it
 * each break costs a round trip and a real meeting to reproduce.
 */
async function describePage(page: Page, label: string): Promise<void> {
  try {
    const url = page.url();
    const title = await page.title().catch(() => "");
    const buttons = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll('button, [role="button"]'))
          .map((el) => (el.getAttribute("aria-label") || el.textContent || "").trim())
          .filter((t) => t && t.length <= 60)
          .slice(0, 40)
      )
      .catch(() => [] as string[]);
    const bodyText = await page
      .evaluate(() => (document.body.innerText || "").slice(0, 400))
      .catch(() => "");

    console.error(`[bot] ${label} — url=${url} title=${JSON.stringify(title)}`);
    console.error(`[bot] ${label} — buttons=${JSON.stringify(buttons)}`);
    console.error(`[bot] ${label} — text=${JSON.stringify(bodyText)}`);
  } catch {
    /* diagnostics must never mask the original failure */
  }
}

/** Click the first control that matches any of these accessible names. */
async function clickAny(page: Page, names: (string | RegExp)[], timeoutMs = 4000): Promise<boolean> {
  for (const name of names) {
    try {
      const button = page.getByRole("button", { name }).first();
      await button.waitFor({ state: "visible", timeout: timeoutMs });
      await button.click({ timeout: timeoutMs });
      return true;
    } catch {
      /* try the next phrasing */
    }
  }
  return false;
}

/**
 * Join a meeting as a guest and start listening.
 *
 * Returns once we are actually inside the call — the caller starts recording
 * only then, so a long "waiting to be admitted" screen does not become minutes
 * of silence at the head of every recording.
 */
export async function joinMeeting(options: JoinOptions): Promise<MeetSession> {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    permissions: ["microphone", "camera"],
    // A desktop viewport keeps Meet on its full UI; the mobile layout has
    // different controls entirely.
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  await page.goto(options.meetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  // Meet renders its pre-join screen asynchronously; give it a moment before
  // looking for anything, or every selector races an empty page.
  await page.waitForTimeout(5000);
  await describePage(page, "landed");

  // Meet sometimes opens on a "Got it" / cookie / "Continue without microphone"
  // interstitial. None of these are guaranteed to appear.
  await clickAny(page, [/got it/i, /dismiss/i, /continue without/i], 2500);

  // Turn the camera and mic off before joining. Even with fake devices, joining
  // "live" makes the bot appear as an active participant with a black tile and
  // an open mic, which is both confusing and a privacy smell.
  await clickAny(page, [/turn off microphone/i, /^mute$/i], 2500);
  await clickAny(page, [/turn off camera/i], 2500);

  // Guest join asks for a display name. This is the name your client will see
  // in the participant list, so it must say what it is.
  try {
    const nameBox = page
      .getByRole("textbox", { name: /your name/i })
      .or(page.locator('input[type="text"][aria-label*="name" i]'))
      .first();
    await nameBox.waitFor({ state: "visible", timeout: 8000 });
    await nameBox.fill(options.botName);
  } catch {
    // Already signed in, or Meet skipped the name step — not fatal.
  }

  const asked = await clickAny(
    page,
    [/ask to join/i, /^join now$/i, /join meeting/i, /^join$/i],
    15_000
  );
  if (!asked) {
    await describePage(page, "join-button-not-found");
    await browser.close();
    throw new Error(
      "Could not find Meet's join button — the link may be invalid, or Meet is blocking a guest join"
    );
  }

  options.onWaitingAdmit?.();
  await waitUntilAdmitted(page, options.admitTimeoutMs);

  const startedAt = Date.now();

  const waitForEnd = async (): Promise<"ended" | "max-duration"> => {
    while (Date.now() - startedAt < options.maxDurationMs) {
      if (!(await inCall(page))) return "ended";
      await page.waitForTimeout(5000);
    }
    return "max-duration";
  };

  const leave = async () => {
    await clickAny(page, [/leave call/i, /^leave$/i], 3000);
    await browser.close().catch(() => {});
  };

  return { page, browser, waitForEnd, leave };
}

/**
 * True while we are inside the call.
 *
 * The "leave call" control only exists once admitted and disappears the moment
 * the call ends or we are removed, which makes it both the admission signal and
 * the end-of-call signal.
 */
async function inCall(page: Page): Promise<boolean> {
  try {
    const leaveButton = page.getByRole("button", { name: /leave call/i }).first();
    return await leaveButton.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Block until the host lets us in.
 *
 * Meet gives no event for this — the waiting-room screen simply becomes the
 * call — so we poll for the in-call UI. Being denied looks identical to never
 * being admitted, so both end as a timeout.
 */
async function waitUntilAdmitted(page: Page, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await inCall(page)) return;

    // An explicit refusal is worth failing fast on rather than waiting out the
    // full timeout.
    const denied = await page
      .getByText(/denied your request|can't join this|no one responded/i)
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (denied) {
      await describePage(page, "join-denied");
      throw new Error("The host did not admit the bot");
    }

    await page.waitForTimeout(3000);
  }

  await describePage(page, "admit-timeout");
  throw new Error("Timed out waiting to be admitted to the meeting");
}

/**
 * Participant names, read the same way the extension reads them.
 *
 * The bot hears one mixed stream exactly like a human participant does, so
 * names still have to come from the page. On a 1-on-1 this single name replaces
 * "Client" throughout the transcript.
 */
export async function readParticipants(page: Page): Promise<string[]> {
  try {
    return await page.evaluate(() => {
      const names = new Set<string>();
      for (const tile of Array.from(document.querySelectorAll("[data-participant-id]"))) {
        for (const attr of ["data-self-name", "aria-label"]) {
          const value = tile.getAttribute(attr)?.trim();
          if (value && value.length <= 60) names.add(value);
        }
      }
      return [...names];
    });
  } catch {
    return [];
  }
}

/**
 * Meet's own live captions, which print the speaker's real name beside each
 * line. Used for names only — the words come from Sarvam, which is far better
 * at Marathi and Hindi than Meet's captions are.
 */
export async function enableCaptions(page: Page): Promise<boolean> {
  // Direct control first — present on some layouts.
  if (await clickAny(page, [/turn on captions/i, /^captions$/i], 4000)) return true;

  // Otherwise captions live behind the "More options" overflow menu, which is
  // where a guest UI usually puts them. Without this the bot silently gets no
  // captions at all — and captions are the only source of per-speaker names on
  // a group call, which is the case the bot exists to fix.
  if (await clickAny(page, [/more options/i, /^more$/i], 3000)) {
    if (await clickAny(page, [/turn on captions/i, /^captions$/i], 3000)) return true;

    // Menu items are not buttons in every Meet build.
    try {
      await page.getByRole("menuitem", { name: /caption/i }).first().click({ timeout: 3000 });
      return true;
    } catch {
      /* fall through */
    }
    await page.keyboard.press("Escape").catch(() => {});
  }

  // Keyboard shortcut — Meet's documented toggle, and the last resort.
  try {
    await page.keyboard.press("c");
    return await page
      .locator('[role="region"][aria-label*="aption" i]')
      .first()
      .isVisible({ timeout: 3000 });
  } catch {
    return false;
  }
}

export interface BotCaption {
  speaker: string;
  text: string;
  t: number;
}

/**
 * Poll the caption panel and accumulate finished lines.
 *
 * Meet rewrites a caption in place while it recognises the sentence, so the
 * same row is read many times; only the last form of each row is kept.
 */
export function watchCaptions(page: Page, startedAt: number) {
  const byRow = new Map<string, BotCaption>();

  const tick = async () => {
    try {
      const rows = await page.evaluate(() => {
        const region =
          document.querySelector('[role="region"][aria-label*="aption" i]') ??
          document.querySelector(".a4cQT");
        if (!region) return [];

        return Array.from(region.children).map((row, index) => {
          const texts = Array.from(row.querySelectorAll("span, div"))
            .filter((el) => el.childElementCount === 0)
            .map((el) => (el.textContent ?? "").trim())
            .filter(Boolean);
          return { index, texts };
        });
      });

      for (const row of rows) {
        if (row.texts.length < 2) continue;
        const speaker = row.texts.find((t) => t.length <= 40 && !/[.?!]$/.test(t));
        const text = row.texts.reduce((a, b) => (b.length > a.length ? b : a), "");
        if (!speaker || !text || speaker === text) continue;

        const key = `${row.index}:${speaker}`;
        const existing = byRow.get(key);
        if (existing) existing.text = text;
        else byRow.set(key, { speaker, text, t: Date.now() - startedAt });
      }
    } catch {
      /* page closed mid-poll */
    }
  };

  const timer = setInterval(tick, 2000);

  return {
    stop: () => {
      clearInterval(timer);
      return [...byRow.values()].sort((a, b) => a.t - b.t);
    },
  };
}
