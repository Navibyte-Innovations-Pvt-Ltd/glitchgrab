/**
 * The Glitchgrab control inside Google Meet (#311).
 *
 * A floating pill on the Meet page: which project this call belongs to, and one
 * button to send the recording bot. It exists because the alternative — copy
 * the link, switch to the dashboard, pick a project, press send — happens in
 * the sixty seconds before a client call, which is exactly when nobody wants to
 * be doing it, and when a wrong project pick files a client conversation
 * against the wrong customer.
 *
 * Everything here is defensive: this is injected into an app we don't control,
 * so a failure must degrade to "no pill" rather than break the user's meeting.
 */

const PILL_ID = "glitchgrab-meet-pill";

interface Repo {
  id: string;
  fullName: string;
}

interface PillState {
  repos: Repo[];
  repoId: string | null;
  /** Where the project came from — shown so the operator can trust it or not. */
  source: "calendar" | "remembered" | "default" | null;
  phase: "loading" | "idle" | "sending" | "sent" | "error";
  message: string;
}

const state: PillState = {
  repos: [],
  repoId: null,
  source: null,
  phase: "loading",
  message: "connecting…",
};

let root: HTMLElement | null = null;
let mounting = false;
let observer: MutationObserver | null = null;

const MOUNT_ATTEMPTS = 12;
const RETRY_MS = 5000;

/** Visible in the Meet tab's console — the only place to debug an injected UI. */
function log(message: string) {
  console.log("[Glitchgrab]", message);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function send<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        // Chrome reports a dead/sleeping worker here rather than throwing.
        // Swallowing it produced "extension not responding" for every cause,
        // which is useless — surface what Chrome actually said.
        const err = chrome.runtime.lastError;
        if (err) log(`background error: ${err.message}`);
        resolve(response as T);
      });
    } catch (err) {
      log(`sendMessage threw: ${err instanceof Error ? err.message : String(err)}`);
      resolve(undefined as T);
    }
  });
}

function styles(): string {
  // `button#id` + !important on the structural properties: Meet ships global
  // button resets that otherwise strip the background and sizing, which left
  // just a floating dot. Specificity here is not laziness — we are a guest in
  // someone else's stylesheet and cannot rename their rules.
  return `
    button#${PILL_ID} {
      /* Size, radius, margin and colour are measured from Meet's own control
         at mount time — see matchNeighbourStyle. Only layout lives here. */
      box-sizing: border-box !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      /* Centre against Meet's other controls regardless of the row's
         align-items, which changes between layouts. */
      align-self: center !important;
      vertical-align: middle !important;
      background: #333537 !important;
      border: 0 !important; outline: 0 !important; box-shadow: none !important;
      cursor: pointer !important; padding: 0 !important;
      flex: 0 0 auto !important;
      transition: background .15s ease;
    }
    button#${PILL_ID}:hover { background: #3f4143 !important; }
    button#${PILL_ID}:disabled { opacity: .6 !important; cursor: default !important; }
    button#${PILL_ID} .gg-dot {
      width: 14px !important; height: 14px !important;
      border-radius: 50% !important; display: block !important;
      background: #34a853;
      transition: background .15s ease;
    }
    button#${PILL_ID} .gg-dot.busy { background: #fbbc04; }
    button#${PILL_ID} .gg-dot.bad  { background: #ea4335; }
    button#${PILL_ID} .gg-dot.live { background: #ea4335; animation: gg-pulse 1.4s infinite; }
    @keyframes gg-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
  `;
}

/**
 * One round button, built with DOM APIs rather than innerHTML.
 *
 * Repo names and server error strings land in the tooltip, and this runs inside
 * Google Meet — an innerHTML template here would be script execution on a page
 * holding a live meeting session.
 *
 * Deliberately not a dropdown: the project is resolved automatically, and a
 * wide control pushed Meet's own buttons out of their container. The tooltip
 * carries the detail so the control stays the size of everything around it.
 */
function render() {
  if (!root) return;

  const button = root as HTMLButtonElement;
  button.textContent = "";
  button.disabled = state.phase !== "idle";

  const dot = document.createElement("span");
  dot.className =
    "gg-dot" +
    (state.phase === "error"
      ? " bad"
      : state.phase === "sending" || state.phase === "loading"
        ? " busy"
        : state.phase === "sent"
          ? " live"
          : "");
  button.appendChild(dot);

  const project = state.repos.find((r) => r.id === state.repoId)?.fullName;
  const detail =
    state.phase === "sent"
      ? "Bot is joining — admit it when it knocks"
      : state.phase === "error" || state.phase === "loading"
        ? state.message
        : project
          ? `Record this call → ${project}${state.source === "calendar" ? " (from calendar)" : ""}`
          : "Glitchgrab";

  button.title = `Glitchgrab · ${detail}`;
  button.setAttribute("aria-label", button.title);
}

async function sendBot() {
  if (!state.repoId) return;

  state.phase = "sending";
  state.message = "";
  render();

  const result = await send<{ ok: boolean; error?: string }>({
    type: "MEET_SEND_BOT",
    repoId: state.repoId,
    meetUrl: location.href.split("?")[0],
    title: document.title === "Meet" ? null : document.title,
  });

  if (result?.ok) {
    state.phase = "sent";
    state.message = "Bot is joining — admit it when it knocks.";
  } else {
    state.phase = "error";
    state.message = result?.error ?? "Could not send the bot";
  }
  render();
}

/**
 * Where to sit inside Meet's grey control group.
 *
 * Inside, as the first child — the button is now exactly the size of Meet's own
 * controls (48px round), so it fits the row instead of stretching it. An
 * earlier wide version had to sit outside to avoid pushing the mic out, but
 * outside means sitting on the near-black page background where a dark circle
 * is invisible and looks detached from the controls.
 *
 * The group is found from the microphone's accessible name: Google's class
 * names are generated and rotate constantly, while the screen-reader label has
 * to stay meaningful.
 */
/**
 * True once actually inside the call, not sitting in the pre-join lobby.
 *
 * The lobby has its own mic and camera buttons on the video preview, which look
 * identical to the real controls — so anchoring on the mic alone put the button
 * on the "Ready to join?" screen, half-cut and useless. "Leave call" only
 * exists once you are in, which makes it the honest signal.
 *
 * There is nothing to record before joining anyway, so this is also just
 * correct behaviour rather than only a layout fix.
 */
function isInCall(): boolean {
  return Boolean(
    document.querySelector('[aria-label*="Leave call" i], [aria-label*="leave the call" i]')
  );
}

/**
 * Copy the size and colour of one of Meet's own controls.
 *
 * Hard-coding 48px and a grey was guesswork that either stretched the row or
 * rendered a circle that didn't match its neighbours — and both change with
 * Meet's redesigns and window size. Measuring the real mic button means the
 * button matches whatever Meet is currently doing, without tracking it.
 */
function matchNeighbourStyle(button: HTMLElement, neighbour: HTMLElement | null) {
  if (!neighbour) return;

  const s = getComputedStyle(neighbour);
  const size = neighbour.getBoundingClientRect();
  if (!size.width || !size.height) return;

  button.style.setProperty("width", `${Math.round(size.width)}px`, "important");
  button.style.setProperty("height", `${Math.round(size.height)}px`, "important");
  button.style.setProperty("min-width", `${Math.round(size.width)}px`, "important");
  button.style.setProperty("min-height", `${Math.round(size.height)}px`, "important");
  button.style.setProperty("border-radius", s.borderRadius, "important");
  button.style.setProperty("margin", s.margin, "important");
  // Meet's controls are often translucent white over the bar; copying the
  // computed value keeps us identical in both light and dark.
  if (s.backgroundColor && s.backgroundColor !== "rgba(0, 0, 0, 0)") {
    button.style.setProperty("background-color", s.backgroundColor, "important");
  }
}

function findMicButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '[aria-label*="microphone" i], [aria-label*="Turn off mic" i], [aria-label*="Turn on mic" i]'
  );
}

/** The grey control group that holds mic, camera and the rest. */
function findControlGroup(): HTMLElement | null {
  if (!isInCall()) return null;

  const mic = findMicButton();
  if (!mic) return null;

  let group: HTMLElement | null = mic.parentElement;
  for (let depth = 0; group && depth < 6; depth++) {
    if (group.querySelectorAll("button, [role='button']").length >= 3) return group;
    group = group.parentElement;
  }
  return null;
}

/**
 * Keep the pill on screen.
 *
 * Meet swaps its DOM between lobby and call and re-renders the control bar, so
 * this runs on a timer and re-docks whenever the pill has been torn out.
 */
function ensureMounted() {
  const existing = document.getElementById(PILL_ID);
  const group = findControlGroup();

  // Not in the call (or Meet's controls aren't rendered): show nothing.
  if (!group) {
    existing?.remove();
    root = null;
    return;
  }

  // Already the leftmost control in this group — do NOTHING.
  //
  // This early return is what stops the flicker. An earlier version compared
  // against `group.firstElementChild`, which becomes the button ITSELF once
  // mounted, so the check never matched: it removed and re-inserted on every
  // tick, the observer saw its own mutation, and the button strobed.
  if (existing && existing.parentElement === group && group.firstElementChild === existing) {
    return;
  }

  existing?.remove();

  // Re-checked on every re-dock: Meet's re-renders can take our <style> too,
  // which would leave the button unstyled rather than missing — harder to spot.
  if (!document.getElementById(`${PILL_ID}-style`)) {
    const style = document.createElement("style");
    style.id = `${PILL_ID}-style`;
    style.textContent = styles();
    document.head.appendChild(style);
  }

  root = document.createElement("button");
  root.id = PILL_ID;
  root.addEventListener("click", () => void sendBot());

  group.insertBefore(root, group.firstElementChild);
  matchNeighbourStyle(root, findMicButton());

  render();
}

/**
 * Re-dock the pill the instant Meet tears it out.
 *
 * Meet rebuilds its control bar constantly — on layout changes, participants
 * joining, the tile view switching — and takes any injected node with it. A
 * timer alone makes the pill visibly flicker in and out; an observer puts it
 * back in the same frame, so it simply looks like part of the bar.
 *
 * The interval stays as a backstop for rebuilds that don't touch body's
 * subtree in a way the observer sees.
 */
function watchToolbar() {
  if (observer) return;

  let queued = false;
  observer = new MutationObserver(() => {
    if (queued) return;
    // Coalesce: Meet emits mutations in bursts, and re-docking per mutation
    // would run this hundreds of times a second during a layout change.
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      try {
        ensureMounted();
      } catch {
        /* never let our repair break the page */
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(ensureMounted, 5000);
}

/**
 * Show the pill on a Meet call page.
 *
 * Safe to call repeatedly — Meet swaps its DOM between the lobby and the call,
 * which would otherwise take the pill with it.
 */
export async function mountMeetPill(): Promise<void> {
  if (mounting) return;
  mounting = true;

  // Retry rather than give up: at document_idle the operator may not be logged
  // in yet, the service worker may be asleep, and Meet's control bar may not
  // exist. A single silent attempt is why this looked like "the pill is just
  // missing" with nothing to debug.
  // Mount the shell FIRST. If the control never appears at all, the content
  // script isn't running — a completely different problem from "the project
  // lookup failed", and previously the two were indistinguishable because
  // nothing rendered until everything had succeeded.
  ensureMounted();
  watchToolbar();

  for (let attempt = 1; attempt <= MOUNT_ATTEMPTS; attempt++) {
    if (!/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(location.href)) {
      log(`not a call URL (${location.href}) — waiting`);
      await wait(RETRY_MS);
      continue;
    }

    const resolved = await send<{
      ok: boolean;
      repos?: Repo[];
      suggested?: { repoId: string; repoFullName: string; source: string } | null;
      lastRepoId?: string | null;
      error?: string;
    }>({ type: "MEET_RESOLVE_PROJECT", meetUrl: location.href.split("?")[0] });

    if (!resolved) {
      log(`attempt ${attempt}: no reply from the extension background`);
      state.message = "extension not responding";
      render();
      await wait(RETRY_MS);
      continue;
    }
    if (!resolved.ok) {
      log(`attempt ${attempt}: ${resolved.error ?? "could not resolve project"}`);
      state.message = resolved.error ?? "not logged in";
      render();
      await wait(RETRY_MS);
      continue;
    }
    if (!resolved.repos?.length) {
      log("no projects available for this login — nothing to record against");
      state.message = "no projects";
      render();
      mounting = false;
      return;
    }

    state.repos = resolved.repos;

    if (resolved.suggested) {
      state.repoId = resolved.suggested.repoId;
      state.source = "calendar";
    } else if (resolved.lastRepoId && resolved.repos.some((r) => r.id === resolved.lastRepoId)) {
      state.repoId = resolved.lastRepoId;
      state.source = "remembered";
    } else {
      state.repoId = resolved.repos[0].id;
      state.source = "default";
    }

    state.phase = "idle";
    state.message = "";
    render();
    log(`ready (${state.repos.length} projects, source: ${state.source})`);
    mounting = false;
    return;
  }

  log("gave up after retries — open the extension popup and check you're logged in");
  state.message = "not logged in";
  render();
  mounting = false;
}
