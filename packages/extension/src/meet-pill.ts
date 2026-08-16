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
  phase: "idle" | "sending" | "sent" | "error";
  message: string;
}

const state: PillState = {
  repos: [],
  repoId: null,
  source: null,
  phase: "idle",
  message: "",
};

let root: HTMLElement | null = null;
let mounting = false;

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
        void chrome.runtime.lastError;
        resolve(response as T);
      });
    } catch {
      resolve(undefined as T);
    }
  });
}

function styles(): string {
  return `
    /* Docked into Meet's own control bar, so it reads as part of the call
       controls rather than something floating on top of them. */
    #${PILL_ID} {
      display: inline-flex; align-items: center; gap: 8px;
      height: 48px; padding: 0 14px; border-radius: 9999px;
      background: #3c4043; border: 0;
      font-family: "Google Sans", Roboto, -apple-system, sans-serif;
      color: #e8eaed; font-size: 12px; line-height: 1; white-space: nowrap;
      margin-right: 8px;
    }
    /* Fallback when the toolbar can't be found — better floating than absent. */
    #${PILL_ID}.gg-floating {
      position: fixed; bottom: 96px; left: 24px; z-index: 2147483000;
      box-shadow: 0 6px 24px rgba(0,0,0,.45);
    }
    #${PILL_ID} .gg-dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; }
    #${PILL_ID} .gg-dot.busy { background: #fbbf24; }
    #${PILL_ID} .gg-dot.bad { background: #f87171; }
    #${PILL_ID} select {
      background: #171717; color: #e5e5e5; border: 1px solid #2a2a2a;
      border-radius: 6px; padding: 4px 6px; font-size: 11px; max-width: 190px;
    }
    #${PILL_ID} button {
      background: #7f1d1d; color: #fecaca; border: 0; cursor: pointer;
      border-radius: 9999px; padding: 6px 12px; font-size: 11px; font-weight: 700;
    }
    #${PILL_ID} button:disabled { opacity: .55; cursor: not-allowed; }
    #${PILL_ID} .gg-msg { color: #9aa0a6; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
    #${PILL_ID} .gg-src { color: #80868b; font-size: 10px; }
    #${PILL_ID} strong { font-weight: 500; }
  `;
}

/**
 * Build the pill with DOM APIs rather than innerHTML.
 *
 * Repo names and error strings come from the server, and this runs inside
 * Google Meet — one crafted string in an innerHTML template would be script
 * execution on a page holding a live meeting session.
 */
function render() {
  if (!root) return;

  root.textContent = "";

  const busy = state.phase === "sending";

  const dot = document.createElement("span");
  dot.className =
    "gg-dot" +
    (state.phase === "error" ? " bad" : state.phase === "sending" ? " busy" : "");
  root.appendChild(dot);

  const brand = document.createElement("strong");
  brand.textContent = "Glitchgrab";
  root.appendChild(brand);

  if (state.phase === "sent") {
    const done = document.createElement("span");
    done.className = "gg-msg";
    done.textContent = state.message;
    root.appendChild(done);
    return;
  }

  const select = document.createElement("select");
  select.id = "gg-repo";
  select.disabled = busy;
  for (const repo of state.repos) {
    const option = document.createElement("option");
    option.value = repo.id;
    option.textContent = repo.fullName;
    option.selected = repo.id === state.repoId;
    select.appendChild(option);
  }
  select.addEventListener("change", () => {
    state.repoId = select.value;
    // Remember the override so the next unscheduled call starts here.
    void send({ type: "MEET_REMEMBER_REPO", repoId: state.repoId });
    state.source = "remembered";
    render();
  });
  root.appendChild(select);

  const sourceLabel =
    state.source === "calendar"
      ? "from calendar"
      : state.source === "remembered"
        ? "last used"
        : "";
  if (sourceLabel) {
    const src = document.createElement("span");
    src.className = "gg-src";
    src.textContent = sourceLabel;
    root.appendChild(src);
  }

  const button = document.createElement("button");
  button.id = "gg-send";
  button.disabled = busy || !state.repoId;
  button.textContent = busy ? "Sending…" : "● Record";
  button.addEventListener("click", () => void sendBot());
  root.appendChild(button);

  if (state.message) {
    const msg = document.createElement("span");
    msg.className = "gg-msg";
    msg.textContent = state.message;
    root.appendChild(msg);
  }
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
 * The mic control's own slot inside Meet's grey control group.
 *
 * Anchoring to the mic specifically — rather than to "the bar" — is what puts
 * the pill inside the same rounded group as the call controls instead of
 * floating beside it. Located by the microphone's accessible name, because
 * Google's class names are generated and change without notice while the
 * screen-reader label has to stay meaningful.
 */
function findMicSlot(): { parent: HTMLElement; before: HTMLElement } | null {
  const mic = document.querySelector<HTMLElement>(
    '[aria-label*="microphone" i], [aria-label*="Turn off mic" i], [aria-label*="Turn on mic" i]'
  );
  if (!mic) return null;

  // Meet wraps each control in a positioning div; we want to sit beside that
  // wrapper, not inside the button itself.
  const slot = mic.closest<HTMLElement>("div[jscontroller], div[data-tooltip-id]") ?? mic.parentElement;
  const parent = slot?.parentElement;
  if (!slot || !parent) return null;

  return { parent, before: slot };
}

/**
 * Keep the pill on screen.
 *
 * Meet swaps its DOM between lobby and call and re-renders the control bar, so
 * this runs on a timer and re-docks whenever the pill has been torn out.
 */
function ensureMounted() {
  const existing = document.getElementById(PILL_ID);
  const slot = findMicSlot();

  // Already sitting next to the mic — nothing to do.
  if (existing && slot && existing.nextElementSibling === slot.before) return;
  // Floating fallback is up and the controls still aren't there — leave it be.
  if (existing && !slot) return;

  existing?.remove();

  if (!document.getElementById(`${PILL_ID}-style`)) {
    const style = document.createElement("style");
    style.id = `${PILL_ID}-style`;
    style.textContent = styles();
    document.head.appendChild(style);
  }

  root = document.createElement("div");
  root.id = PILL_ID;

  if (slot) {
    // Directly before the mic's slot — inside the same grey group, immediately
    // to its left.
    slot.parent.insertBefore(root, slot.before);
  } else {
    root.classList.add("gg-floating");
    document.body.appendChild(root);
  }

  render();
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
      await wait(RETRY_MS);
      continue;
    }
    if (!resolved.ok) {
      log(`attempt ${attempt}: ${resolved.error ?? "could not resolve project"}`);
      await wait(RETRY_MS);
      continue;
    }
    if (!resolved.repos?.length) {
      log("no projects available for this login — nothing to record against");
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

    ensureMounted();
    log(`mounted (${state.repos.length} projects, source: ${state.source})`);

    // Meet rebuilds its control bar constantly; keep re-docking.
    setInterval(ensureMounted, 5000);
    mounting = false;
    return;
  }

  log("gave up after retries — open the extension popup and check you're logged in");
  mounting = false;
}
