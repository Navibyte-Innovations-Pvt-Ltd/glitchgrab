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
const POPOVER_ID = "glitchgrab-meet-popover";

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

const RETRY_MS = 5000;
const RETRY_MAX_MS = 30000;
/**
 * How long to wait for the background worker before calling it dead.
 *
 * `chrome.runtime.sendMessage`'s callback is not guaranteed to fire: if the MV3
 * worker is torn down mid-handler, or a handler returns `true` and then never
 * calls `reply`, the promise simply never settles. That left the button stuck
 * on "connecting…" forever with no error and nothing in the log — the failure
 * mode that looks exactly like "it is just slow".
 */
const REPLY_TIMEOUT_MS = 8000;

/** Visible in the Meet tab's console — the only place to debug an injected UI. */
function log(message: string) {
  console.log("[Glitchgrab]", message);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function send<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: T) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // A reply that never comes must still end the wait — see REPLY_TIMEOUT_MS.
    const timer = setTimeout(() => {
      log(`no reply to ${String(message.type)} within ${REPLY_TIMEOUT_MS}ms`);
      done(undefined as T);
    }, REPLY_TIMEOUT_MS);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer);
        // Chrome reports a dead/sleeping worker here rather than throwing.
        // Swallowing it produced "extension not responding" for every cause,
        // which is useless — surface what Chrome actually said.
        const err = chrome.runtime.lastError;
        if (err) log(`background error: ${err.message}`);
        done(response as T);
      });
    } catch (err) {
      clearTimeout(timer);
      log(`sendMessage threw: ${err instanceof Error ? err.message : String(err)}`);
      done(undefined as T);
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
      /* The progress ring is absolutely positioned against this. */
      position: relative !important;
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

    /* Ring that spins around the dot while we're still talking to the server.
       A static amber dot is indistinguishable from a broken one — the motion is
       the difference between "working on it" and "give up and reload". */
    button#${PILL_ID} .gg-ring {
      position: absolute !important;
      width: 26px !important; height: 26px !important;
      border-radius: 50% !important;
      border: 2px solid rgba(255,255,255,.14) !important;
      border-top-color: #fbbc04 !important;
      animation: gg-spin .85s linear infinite;
      pointer-events: none !important;
    }
    @keyframes gg-spin { to { transform: rotate(360deg) } }

    /* Project picker, opened on hover — the same shape Meet uses for its own
       camera and microphone menus, so it reads as native. */
    #${POPOVER_ID} {
      position: fixed; z-index: 2147483000;
      background: #202124; color: #e8eaed;
      border-radius: 12px; padding: 8px;
      box-shadow: 0 8px 28px rgba(0,0,0,.55);
      font-family: "Google Sans", Roboto, -apple-system, sans-serif;
      font-size: 13px; min-width: 260px; max-width: 380px;
      max-height: 320px; overflow-y: auto;
    }
    #${POPOVER_ID} .gg-head {
      color: #9aa0a6; font-size: 11px; text-transform: uppercase;
      letter-spacing: .8px; padding: 6px 10px 8px;
    }
    /* Search box. With twenty-odd repos the list is longer than the panel, so
       scanning it by eye during the minute before a call is not realistic. */
    #${POPOVER_ID} .gg-search {
      display: block; box-sizing: border-box; width: 100%;
      margin: 0 0 6px; padding: 8px 10px;
      background: #303134; color: #e8eaed;
      border: 1px solid #3c4043; border-radius: 8px;
      font-family: inherit; font-size: 13px; outline: none;
    }
    #${POPOVER_ID} .gg-search:focus { border-color: #8ab4f8; }
    #${POPOVER_ID} .gg-search::placeholder { color: #9aa0a6; }
    /* Only the list scrolls — the search box has to stay reachable. */
    #${POPOVER_ID} .gg-list { max-height: 240px; overflow-y: auto; }
    #${POPOVER_ID} .gg-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; border-radius: 8px; cursor: pointer;
    }
    #${POPOVER_ID} .gg-item:hover, #${POPOVER_ID} .gg-item.active { background: #303134; }
    #${POPOVER_ID} .gg-item .gg-tick { width: 16px; color: #8ab4f8; flex: 0 0 16px; }
    /* Owner above, repo below: every row shared the same owner prefix, which
       pushed the part that actually differs off the right edge. */
    #${POPOVER_ID} .gg-name {
      min-width: 0; display: flex; flex-direction: column; line-height: 1.3;
    }
    #${POPOVER_ID} .gg-repo {
      color: #e8eaed;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #${POPOVER_ID} .gg-owner {
      color: #9aa0a6; font-size: 11px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #${POPOVER_ID} mark { background: transparent; color: #8ab4f8; font-weight: 500; }
    #${POPOVER_ID} .gg-empty { color: #9aa0a6; padding: 10px; }
    #${POPOVER_ID} .gg-foot { color: #9aa0a6; font-size: 11px; padding: 8px 10px 4px; }
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
  // Only block the click while something is genuinely in flight. Disabling on
  // "error" too meant a failed send could never be retried without a page
  // reload, which is a poor thing to ask for thirty seconds before a call.
  button.disabled = state.phase === "loading" || state.phase === "sending";

  if (button.disabled) {
    const ring = document.createElement("span");
    ring.className = "gg-ring";
    button.appendChild(ring);
  }

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

let popoverTimer: ReturnType<typeof setTimeout> | null = null;

let onDocumentDown: ((e: MouseEvent) => void) | null = null;

function closePopover() {
  document.getElementById(POPOVER_ID)?.remove();
  if (onDocumentDown) {
    document.removeEventListener("mousedown", onDocumentDown, true);
    onDocumentDown = null;
  }
}

/**
 * Show the project list above the button.
 *
 * Hover rather than click, because the button's click is "record now" — the
 * common action shouldn't require going through a menu, but the project still
 * has to be inspectable and changeable before a client call.
 */
function openPopover() {
  if (!root || state.repos.length === 0) return;
  closePopover();

  const panel = document.createElement("div");
  panel.id = POPOVER_ID;

  const head = document.createElement("div");
  head.className = "gg-head";
  head.textContent = "Record this call to";
  panel.appendChild(head);

  const search = document.createElement("input");
  search.className = "gg-search";
  search.type = "text";
  search.placeholder = "Search projects…";
  search.spellcheck = false;
  // Meet listens for bare keystrokes as call shortcuts — `d` toggles the mic,
  // `e` the camera. Without stopping propagation, typing a project name would
  // mute the operator mid-sentence.
  search.addEventListener("keydown", (e) => e.stopPropagation());
  search.addEventListener("keypress", (e) => e.stopPropagation());
  search.addEventListener("keyup", (e) => e.stopPropagation());
  panel.appendChild(search);

  const list = document.createElement("div");
  list.className = "gg-list";
  panel.appendChild(list);

  const foot = document.createElement("div");
  foot.className = "gg-foot";
  foot.textContent =
    state.source === "calendar" ? "Chosen from your calendar" : "Click the dot to send the bot";
  panel.appendChild(foot);

  let matches: Repo[] = [];
  let active = 0;

  function choose(repo: Repo) {
    state.repoId = repo.id;
    state.source = "remembered";
    void send({ type: "MEET_REMEMBER_REPO", repoId: repo.id });
    render();
    closePopover();
  }

  /**
   * Split "owner/name" and highlight the matched run.
   *
   * Built with text nodes rather than innerHTML: repo names come from the
   * server and this renders inside a live Google Meet session.
   */
  function label(repo: Repo, query: string): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = "gg-name";

    const slash = repo.fullName.indexOf("/");
    const owner = slash >= 0 ? repo.fullName.slice(0, slash) : "";
    const name = slash >= 0 ? repo.fullName.slice(slash + 1) : repo.fullName;

    const nameEl = document.createElement("span");
    nameEl.className = "gg-repo";
    const at = query ? name.toLowerCase().indexOf(query) : -1;
    if (at >= 0) {
      nameEl.appendChild(document.createTextNode(name.slice(0, at)));
      const hit = document.createElement("mark");
      hit.textContent = name.slice(at, at + query.length);
      nameEl.appendChild(hit);
      nameEl.appendChild(document.createTextNode(name.slice(at + query.length)));
    } else {
      nameEl.textContent = name;
    }
    wrap.appendChild(nameEl);

    if (owner) {
      const ownerEl = document.createElement("span");
      ownerEl.className = "gg-owner";
      ownerEl.textContent = owner;
      wrap.appendChild(ownerEl);
    }
    return wrap;
  }

  function paint() {
    const query = search.value.trim().toLowerCase();
    matches = query
      ? state.repos.filter((r) => r.fullName.toLowerCase().includes(query))
      : state.repos;

    // Keep the highlight on a row that still exists after filtering.
    if (active >= matches.length) active = Math.max(0, matches.length - 1);

    list.textContent = "";

    if (matches.length === 0) {
      const empty = document.createElement("div");
      empty.className = "gg-empty";
      empty.textContent = "No projects match";
      list.appendChild(empty);
      return;
    }

    matches.forEach((repo, index) => {
      const item = document.createElement("div");
      item.className = "gg-item" + (index === active ? " active" : "");

      const tick = document.createElement("span");
      tick.className = "gg-tick";
      tick.textContent = repo.id === state.repoId ? "✓" : "";
      item.appendChild(tick);
      item.appendChild(label(repo, query));

      item.addEventListener("mouseenter", () => {
        active = index;
        for (const row of list.children) row.classList.remove("active");
        item.classList.add("active");
      });
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        choose(repo);
      });

      list.appendChild(item);
    });

    list.children[active]?.scrollIntoView({ block: "nearest" });
  }

  search.addEventListener("input", () => {
    // A new query invalidates the old cursor position entirely.
    active = 0;
    paint();
  });

  search.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (matches.length === 0) return;
      active =
        (active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      paint();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const repo = matches[active];
      if (repo) choose(repo);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePopover();
    }
  });

  // Keep it open while the pointer is inside it.
  panel.addEventListener("mouseenter", () => {
    if (popoverTimer) clearTimeout(popoverTimer);
  });
  panel.addEventListener("mouseleave", scheduleClosePopover);

  // Focus keeps the panel alive past hover, so clicking anywhere else is the
  // way out. Capture phase: Meet stops propagation on its own controls.
  onDocumentDown = (e: MouseEvent) => {
    const target = e.target as Node;
    if (panel.contains(target) || root?.contains(target)) return;
    closePopover();
  };
  document.addEventListener("mousedown", onDocumentDown, true);

  document.body.appendChild(panel);
  paint();

  // Anchor above the button, clamped to the viewport so it never runs off.
  const anchor = root.getBoundingClientRect();
  const box = panel.getBoundingClientRect();
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - box.width - 8));
  panel.style.left = `${left}px`;
  panel.style.top = `${Math.max(8, anchor.top - box.height - 12)}px`;

  search.focus({ preventScroll: true });
}

function scheduleClosePopover() {
  if (popoverTimer) clearTimeout(popoverTimer);
  // Small grace so moving the pointer from button to panel doesn't close it.
  popoverTimer = setTimeout(() => {
    // Never yank the panel out from under someone typing in the search box —
    // the pointer routinely drifts off the panel while the hands are on the
    // keyboard, and hover alone would treat that as "done".
    const panel = document.getElementById(POPOVER_ID);
    if (panel && document.activeElement && panel.contains(document.activeElement)) return;
    closePopover();
  }, 250);
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

  // Our own popover lives on body and must never be mistaken for Meet's DOM
  // churn — it is removed with the button when we leave the call.

  // Not in the call (or Meet's controls aren't rendered): show nothing.
  if (!group) {
    existing?.remove();
    closePopover();
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
  root.addEventListener("click", () => {
    closePopover();
    void sendBot();
  });
  root.addEventListener("mouseenter", () => {
    if (popoverTimer) clearTimeout(popoverTimer);
    openPopover();
  });
  root.addEventListener("mouseleave", scheduleClosePopover);

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

  // Retry for as long as the tab is open, rather than a fixed dozen attempts.
  //
  // Everything this depends on can arrive late and in any order: the operator
  // signs into the dashboard in another tab, the service worker wakes, the
  // network comes back, the call is joined ten minutes after the page loaded.
  // Giving up after a minute meant the button sat permanently amber even once
  // the reason had gone away, and the only fix was reloading Meet mid-call.
  let backoff = RETRY_MS;
  const retry = async (reason: string) => {
    log(reason);
    state.message = reason;
    render();
    await wait(backoff);
    backoff = Math.min(backoff * 1.5, RETRY_MAX_MS);
  };

  for (;;) {
    if (!/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(location.href)) {
      // Not an error — the operator is on the landing page or a lobby URL, so
      // hold the initial wording rather than shouting a failure at them.
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
      await retry("extension not responding");
      continue;
    }
    if (!resolved.ok) {
      await retry(resolved.error ?? "could not resolve project");
      continue;
    }
    if (!resolved.repos?.length) {
      // Recoverable too — the operator may connect a repo in the dashboard
      // while this call is running.
      await retry("no projects");
      continue;
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
}
