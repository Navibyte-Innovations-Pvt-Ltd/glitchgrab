import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { sampleLevel } from "./audio";
import { isSignInWall, loadGoogleSession, saveGoogleSession } from "./auth";
import { clearProfileLocks, hasProfile, PROFILE_DIR } from "./login";

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
   * PulseAudio sink this call's audio must go to. Without it every concurrent
   * meeting plays into the shared default and each recording captures all of
   * them.
   */
  sink?: string;
  /**
   * Fired once the bot is knocking. This is the only state that needs a human:
   * someone has to press Admit inside Meet, and they won't if the dashboard
   * just shows a spinner.
   */
  onWaitingAdmit?: () => void;
  /**
   * Polled while recording. The only way to evict a bot that is sitting in a
   * call it should have left — without it the sole remedy is restarting the
   * service, which destroys every other recording in flight.
   */
  shouldStop?: () => boolean;
}

/** Why the recording stopped. All of these are normal ends, not failures. */
export type EndReason = "ended" | "max-duration" | "alone" | "silent" | "stopped";

export interface MeetSession {
  page: Page;
  /** Null when running from a persistent profile — the context owns the process. */
  browser: Browser | null;
  context: BrowserContext;
  /** Resolves when the call ends (everyone left, we were removed, or the cap). */
  waitForEnd: () => Promise<EndReason>;
  leave: () => Promise<void>;
}

/**
 * Launch Chromium wired to the virtual sound card.
 *
 * The fake media device flags matter: without them Meet blocks on a camera and
 * microphone permission prompt that nobody is there to answer. The bot has no
 * real devices and publishes silence — it is there to listen, not to speak.
 */
export const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-dev-shm-usage",
  // Auto-accept the camera/mic permission prompt.
  "--use-fake-ui-for-media-stream",
  // Publish a synthetic (silent) camera and microphone.
  "--use-fake-device-for-media-stream",
  "--autoplay-policy=no-user-gesture-required",
  // Google checks for automation signals before it checks anything else.
  "--disable-blink-features=AutomationControlled",
  "--disable-features=IsolateOrigins,site-per-process",
  "--lang=en-US",
];

export async function launchBrowser(sink?: string): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: BROWSER_ARGS,
    // PULSE_SINK is what makes this browser's audio land in its own sink.
    ...(sink ? { env: { ...process.env, PULSE_SINK: sink } } : {}),
  });
}

/**
 * A normal Chrome user agent.
 *
 * Playwright's default advertises "HeadlessChrome", which Google treats as an
 * automation signal — on a sign-in-gated flow that is the difference between
 * being let through and being challenged.
 */
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
  const contextOptions = {
    permissions: ["microphone", "camera"] as string[],
    // A desktop viewport keeps Meet on its full UI; the mobile layout has
    // different controls entirely.
    viewport: { width: 1280, height: 720 },
    userAgent: USER_AGENT,
    locale: "en-US",
    timezoneId: process.env.MEET_BOT_TIMEZONE ?? "Asia/Kolkata",
  };

  let browser: Browser | null = null;
  let context: BrowserContext;

  // Prefer the on-disk Chrome profile created by the in-container login. It is
  // a real browser session established by a human on THIS machine, so it has
  // the complete cookie set and no location mismatch — both of which broke the
  // exported-cookie approach. The env-var session stays as the fallback.
  if (await hasProfile()) {
    console.log(`[bot] using Chrome profile at ${PROFILE_DIR}`);
    // The join path hits the same stale-lock trap after a redeploy.
    await clearProfileLocks();
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: true,
      args: BROWSER_ARGS,
      ...(options.sink ? { env: { ...process.env, PULSE_SINK: options.sink } } : {}),
      ...contextOptions,
    });
  } else {
    browser = await launchBrowser(options.sink);
    const storageState = (await loadGoogleSession()) ?? undefined;
    context = await browser.newContext({
      ...contextOptions,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(storageState ? { storageState: storageState as any } : {}),
    });
  }

  const page = context.pages()[0] ?? (await context.newPage());

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
  const shutdown = async () => {
    // In persistent-profile mode there is no separate Browser object; the
    // context owns the process.
    if (browser) await browser.close().catch(() => {});
    else await context.close().catch(() => {});
  };

  if (!asked) {
    await describePage(page, "join-button-not-found");

    // Distinguish the three failures that look identical from the outside.
    // "Selector broke" sends you hunting through meet.ts; "session expired"
    // means re-run seed-auth; "anonymous refused" means the account isn't in
    // the meeting's allowed set. Naming them is the difference between a
    // five-minute fix and an afternoon.
    const pageText = await page.evaluate(() => document.body.innerText || "").catch(() => "");
    const signedOut = isSignInWall(page.url(), pageText);
    const refused = /can't join this video call|you can't join/i.test(pageText);

    await shutdown();

    if (signedOut) {
      throw new Error(
        "The bot is signed out of Google — open the bot's /login session and sign in again"
      );
    }
    if (refused) {
      throw new Error(
        "Google Meet refused this account. Either GOOGLE_STORAGE_STATE is unset (bot is anonymous), or the bot's account is outside the meeting's allowed domain."
      );
    }
    throw new Error("Could not find Meet's join button — the link may be invalid");
  }

  options.onWaitingAdmit?.();
  await waitUntilAdmitted(page, options.admitTimeoutMs);

  // Opening the People panel is free for a bot — nobody is looking at its
  // screen — and it is the one place Meet still renders a real list of who is
  // here. Tile attributes have already been renamed out from under us. Opened
  // before the first participant read, or that read is empty and the transcript
  // loses every real name.
  await openPeoplePanel(page);

  const startedAt = Date.now();

  const waitForEnd = async (): Promise<EndReason> => {
    let aloneSince: number | null = null;
    /** Since when the participant list has been unreadable. */
    let blindSince: number | null = null;
    let lastSoundAt = Date.now();
    let lastProbeAt = 0;

    // One dump of the in-call DOM per recording. When Google renames things
    // again, this is the difference between a fix and another live meeting
    // spent reproducing the break.
    await describePage(page, "in-call");

    while (Date.now() - startedAt < options.maxDurationMs) {
      if (options.shouldStop?.()) {
        console.log("[bot] stop requested — ending the recording");
        return "stopped";
      }
      if (!(await inCall(page))) return "ended";

      const presence = await readPresence(page);

      if (presence.count === null) {
        // Unknown is NOT "someone is here" — it used to be, and that is why a
        // bot could sit alone in an empty room for the full three hours.
        blindSince ??= Date.now();
        aloneSince = null;
      } else {
        blindSince = null;

        // Leaving a Meet as host does NOT end the call — everyone else stays
        // in, including us.
        if (presence.count <= 1) {
          aloneSince ??= Date.now();
          if (Date.now() - aloneSince >= ALONE_GRACE_MS) {
            console.log("[bot] everyone else left — ending the recording");
            return "alone";
          }
        } else {
          // Someone came back, or Meet was mid-render. Only a sustained empty
          // room counts, so a momentary blip doesn't cut a live call short.
          aloneSince = null;
        }
      }

      // Audio backstop. Every DOM check above fails towards "keep recording",
      // and Meet's DOM will be renamed again — the reading can be missing, or
      // simply wrong in the direction that keeps us here. Sound comes off
      // PulseAudio, not off the page, so it survives whatever Google renames.
      if (Date.now() - lastProbeAt >= SOUND_PROBE_INTERVAL_MS) {
        lastProbeAt = Date.now();
        const level = await sampleLevel(options.sink ?? "", 2000);
        // A failed probe is not silence.
        if (level === null || level > SILENCE_LEVEL) lastSoundAt = Date.now();

        // Cannot see the room and cannot hear it. Nothing here is a meeting.
        //
        // Deliberately only in the blind case: the bot hears the REMOTE side
        // only, so an operator-led demo with the client muted is genuinely
        // silent for its whole length. Silence alone must never end a call.
        if (
          blindSince !== null &&
          Date.now() - blindSince >= BLIND_SILENCE_MS &&
          Date.now() - lastSoundAt >= BLIND_SILENCE_MS
        ) {
          console.log("[bot] participant list unreadable and no sound — ending the recording");
          return "silent";
        }
      }

      await page.waitForTimeout(5000);
    }
    return "max-duration";
  };

  const leave = async () => {
    await clickAny(page, [/leave call/i, /^leave$/i], 3000);
    // Only meaningful for the env-var path. A persistent profile writes its own
    // cookies to disk, which is why it ages so much better.
    if (browser) {
      await context
        .storageState()
        .then((s) => saveGoogleSession(s as Record<string, unknown>))
        .catch(() => {});
    }
    await shutdown();
  };

  return { page, browser, context, waitForEnd, leave };
}

/** How long the bot tolerates being the only participant before leaving. */
const ALONE_GRACE_MS = 60_000;

/** How long "cannot read the room AND cannot hear anything" runs before leaving. */
const BLIND_SILENCE_MS = 10 * 60 * 1000;

/** Probing costs a parec spawn, so it runs on its own slower clock. */
const SOUND_PROBE_INTERVAL_MS = 30_000;

/**
 * Peak amplitude below which the sink counts as silent. Room tone and codec
 * noise sit far below this; any speech at all is far above it.
 */
const SILENCE_LEVEL = 0.02;

export interface Presence {
  /** How many people are in the call, bot included. Null when unreadable. */
  count: number | null;
  names: string[];
}

/**
 * Open Meet's People panel and leave it open for the whole call.
 *
 * The bot has no viewer, so the panel costs nothing, and it is the only
 * surface that still lists participants by name — the tile attributes this
 * used to read (`[data-participant-id]`) now yield an empty array on a live
 * call, which is exactly how a bot ended up recording an empty room.
 */
async function openPeoplePanel(page: Page): Promise<boolean> {
  return clickAny(page, [/show everyone/i, /^people$/i, /participants/i], 5000);
}

/**
 * Who is in the call right now.
 *
 * Deliberately several independent readings taking the LARGEST answer: an
 * under-count ends a live call early, which is far worse than a late leave.
 * Every strategy failing is reported as null — "I don't know" — never as zero.
 */
export async function readPresence(page: Page): Promise<Presence> {
  try {
    return await page.evaluate(() => {
      const clean = (value: string | null | undefined) =>
        (value ?? "").replace(/\s+/g, " ").trim();

      const names = new Set<string>();

      // 1. The People panel's rows — the reading that works today.
      //
      // Scoped to the panel, never document-wide: chat, activities and any
      // open menu also use listitem, and counting those inflates the room to
      // "someone is still here" — which is the failure being fixed.
      const panel =
        document.querySelector('[role="list"][aria-label*="articipant" i]') ??
        document.querySelector('[aria-label*="articipant" i] [role="list"]') ??
        document.querySelector('[aria-label*="eople" i] [role="list"]');

      const rows = panel
        ? Array.from(panel.querySelectorAll('[role="listitem"]')).filter(
            (el) => clean(el.textContent).length > 0
          )
        : [];

      for (const row of rows) {
        const label =
          clean(row.getAttribute("aria-label")) || clean(row.querySelector("span, div")?.textContent);
        if (label && label.length <= 60) names.add(label);
      }

      // 2. Video tiles. Free, and still true on some Meet builds.
      const tiles = Array.from(document.querySelectorAll("[data-participant-id]"));
      for (const tile of tiles) {
        for (const attr of ["data-self-name", "aria-label"]) {
          const value = clean(tile.getAttribute(attr));
          if (value && value.length <= 60) names.add(value);
        }
      }

      // 3. The People button's badge ("People 3"). Read from the accessible
      // name only, and only digits sitting next to the word — textContent on a
      // container button drags in unrelated numbers from the page.
      let badge: number | null = null;
      for (const el of Array.from(document.querySelectorAll('button, [role="button"]'))) {
        const match = clean(el.getAttribute("aria-label")).match(
          /(?:people|participants)\D{0,3}(\d+)/i
        );
        if (match) badge = Math.max(badge ?? 0, Number(match[1]));
      }

      // 4. Meet's own "you're the only one here" wording. A transient toast, so
      // it is a last resort rather than the primary signal it used to be.
      const alone = /you'?re the only one here|no one else is here|you are the only one/i.test(
        document.body.innerText || ""
      );

      // Best available reading wins — NOT the largest. Taking the max turns a
      // single bad read into a bot that never leaves, which is the whole bug.
      const count =
        rows.length > 0
          ? rows.length
          : tiles.length > 0
            ? tiles.length
            : badge !== null
              ? badge
              : alone
                ? 1
                : null;

      return { count, names: [...names] };
    });
  } catch {
    return { count: null, names: [] };
  }
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
  return (await readPresence(page)).names;
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
