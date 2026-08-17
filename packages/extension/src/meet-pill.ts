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
const DIALOG_ID = "glitchgrab-meet-dialog";

interface Repo {
  id: string;
  fullName: string;
}

interface PillState {
  repos: Repo[];
  /**
   * Never pre-filled, not even from the calendar or the last call.
   *
   * A pre-selected project turns "start recording" into one click that files a
   * client conversation wherever the previous one went. Deciding is the point:
   * the operator picks, every time, and picking is what starts the recording.
   */
  repoId: string | null;
  /** Which meeting the bot is working on — the handle for status and re-filing. */
  meetingId: string | null;
  /** The bot's own phase, straight from the server. Null before dispatch. */
  botStatus: string | null;
  /** The bot is visible in the participant list, whatever the server says. */
  inRoom: boolean;
  phase: "loading" | "idle" | "sending" | "sent" | "error";
  message: string;
}

const state: PillState = {
  repos: [],
  repoId: null,
  meetingId: null,
  botStatus: null,
  inRoom: false,
  phase: "loading",
  message: "connecting…",
};

let root: HTMLElement | null = null;
let mounting = false;
let observer: MutationObserver | null = null;

/**
 * Cut the retry loop's wait short.
 *
 * The loop backs off up to 30s, which is right while nothing is happening and
 * wrong the instant something is: the operator joins the call, and the button
 * would sit amber for the remainder of a wait that started while they were
 * still in the lobby. Joining is exactly the moment to try again.
 */
let wakeRetry: (() => void) | null = null;

function pokeRetry() {
  const wake = wakeRetry;
  wakeRetry = null;
  wake?.();
}

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
 *
 * Generous on purpose. A local Next.js dev server compiles the route on first
 * hit — measured at 14.7s — and an 8s limit turned that into a false "not
 * responding", a backoff, and a retry that raced the request that was about to
 * succeed. The timeout is a backstop against a dead worker, not a latency
 * budget; the latency budget lives in the background worker, which falls back
 * to its cache at 2.5s.
 */
const REPLY_TIMEOUT_MS = 30000;

const startedAt = Date.now();

/**
 * Visible in the Meet tab's console — the only place to debug an injected UI.
 *
 * Timestamped relative to page load: every problem this UI has had so far was a
 * question of ordering and latency (worker asleep, route compiling, backoff
 * still running), and a bare message can't answer "how long was it stuck?".
 */
function log(message: string) {
  console.log(`[Glitchgrab +${((Date.now() - startedAt) / 1000).toFixed(1)}s]`, message);
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
      /* Lives on <body>, not in Meet's control group — ensureMounted keeps it
         glued to the bar. Size and coordinates are set inline from the live
         measurements; only appearance lives here. */
      position: fixed !important;
      z-index: 2147482999 !important;
      box-sizing: border-box !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      background: #333537 !important;
      color: #e3e3e3 !important;
      font-family: "Google Sans", Roboto, -apple-system, sans-serif !important;
      font-size: 14px !important; font-weight: 500 !important;
      line-height: 1 !important; white-space: nowrap !important;
      border: 0 !important; outline: 0 !important; box-shadow: none !important;
      cursor: pointer !important;
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
    /* Nothing chosen yet. Hollow grey says "waiting on you" — a green dot here
       would read as "recording is handled" when nothing is being recorded. */
    button#${PILL_ID} .gg-dot.idle {
      background: transparent; border: 2px solid #9aa0a6;
    }
    button#${PILL_ID} .gg-dot.done { background: #9aa0a6; }
    /* Hollow, not solid. Error and recording were both flat red, which in a
       glance (or a screenshot) are the same thing — so a failed dispatch read
       as "the bot is recording" and the call went unrecorded. */
    button#${PILL_ID} .gg-dot.bad {
      background: transparent; border: 3px solid #ea4335;
      animation: gg-blink 1s steps(1) infinite;
    }
    @keyframes gg-blink { 50% { border-color: #fdd663 } }
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
      /* Material 3 surface colours and elevation-3 shadow — the same recipe
         Meet's own overflow menu uses, so this reads as part of the app. */
      background: #2d2f31; color: #e3e3e3;
      border-radius: 12px; padding: 8px;
      box-shadow: 0 1px 3px 1px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.55);
      font-family: "Google Sans", "Product Sans", Roboto, -apple-system, sans-serif;
      font-size: 14px; min-width: 288px; max-width: 380px;
    }

    /* Google's scrollbar: thin, no track, thumb inset so it never touches the
       panel edge. The default chunky grey bar is the single most obvious tell
       that a menu isn't native. */
    #${POPOVER_ID} .gg-list, #${DIALOG_ID} .gg-list { scrollbar-width: thin; scrollbar-color: #5f6368 transparent; }
    #${POPOVER_ID} .gg-list::-webkit-scrollbar,
    #${DIALOG_ID} .gg-list::-webkit-scrollbar { width: 12px; }
    #${POPOVER_ID} .gg-list::-webkit-scrollbar-track,
    #${DIALOG_ID} .gg-list::-webkit-scrollbar-track { background: transparent; }
    #${POPOVER_ID} .gg-list::-webkit-scrollbar-thumb,
    #${DIALOG_ID} .gg-list::-webkit-scrollbar-thumb {
      background: #5f6368; border-radius: 8px;
      border: 4px solid transparent; background-clip: content-box;
      min-height: 40px;
    }
    #${POPOVER_ID} .gg-list::-webkit-scrollbar-thumb:hover,
    #${DIALOG_ID} .gg-list::-webkit-scrollbar-thumb:hover {
      background: #80868b; background-clip: content-box;
    }
    #${POPOVER_ID} .gg-head {
      color: #c4c7c5; font-size: 11px; font-weight: 500;
      text-transform: uppercase; letter-spacing: .8px;
      padding: 6px 12px 8px;
    }
    /* Search box. With twenty-odd repos the list is longer than the panel, so
       scanning it by eye during the minute before a call is not realistic. */
    /* Material filled text field: no border at rest, tinted surface, and a
       focus ring rather than a colour-shifting outline. */
    #${POPOVER_ID} .gg-search, #${DIALOG_ID} .gg-search {
      display: block; box-sizing: border-box; width: 100%;
      margin: 0 0 4px; padding: 10px 14px;
      background: #1e1f20; color: #e3e3e3;
      border: 1px solid transparent; border-radius: 24px;
      font-family: inherit; font-size: 14px; outline: none;
    }
    #${POPOVER_ID} .gg-search:focus, #${DIALOG_ID} .gg-search:focus { border-color: #a8c7fa; background: #1e1f20; }
    #${POPOVER_ID} .gg-search::placeholder, #${DIALOG_ID} .gg-search::placeholder { color: #9aa0a6; }
    /* Only the list scrolls — the search box has to stay reachable. */
    #${POPOVER_ID} .gg-list, #${DIALOG_ID} .gg-list { max-height: 264px; overflow-y: auto; padding: 4px 0; }
    #${POPOVER_ID} .gg-item, #${DIALOG_ID} .gg-item {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 12px; border-radius: 8px; cursor: pointer;
      min-height: 40px; box-sizing: border-box;
      transition: background .12s ease;
    }
    #${POPOVER_ID} .gg-item:hover, #${POPOVER_ID} .gg-item.active, #${DIALOG_ID} .gg-item:hover, #${DIALOG_ID} .gg-item.active { background: #37393b; }

    /* Radio, in record red. A tick marks a past choice; a radio says "pick one,
       and this is the one that's picked" — which is what this list is, now that
       picking a project is what starts the recording. */
    #${POPOVER_ID} .gg-radio, #${DIALOG_ID} .gg-radio {
      flex: 0 0 18px; width: 18px; height: 18px;
      border-radius: 50%; box-sizing: border-box;
      border: 2px solid #9aa0a6;
      display: inline-flex; align-items: center; justify-content: center;
      transition: border-color .12s ease;
    }
    #${POPOVER_ID} .gg-item:hover .gg-radio, #${DIALOG_ID} .gg-item:hover .gg-radio { border-color: #c4c7c5; }
    #${POPOVER_ID} .gg-radio.on, #${DIALOG_ID} .gg-radio.on { border-color: #ea4335; }
    #${POPOVER_ID} .gg-radio.on::after, #${DIALOG_ID} .gg-radio.on::after {
      content: ""; width: 10px; height: 10px;
      border-radius: 50%; background: #ea4335;
    }
    /* Owner above, repo below: every row shared the same owner prefix, which
       pushed the part that actually differs off the right edge. */
    #${POPOVER_ID} .gg-name, #${DIALOG_ID} .gg-name {
      min-width: 0; display: flex; flex-direction: column; line-height: 1.35;
    }
    #${POPOVER_ID} .gg-repo, #${DIALOG_ID} .gg-repo {
      color: #e3e3e3; font-size: 14px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #${POPOVER_ID} .gg-owner, #${DIALOG_ID} .gg-owner {
      color: #9aa0a6; font-size: 12px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #${POPOVER_ID} mark, #${DIALOG_ID} mark { background: transparent; color: #a8c7fa; font-weight: 500; }
    #${POPOVER_ID} .gg-empty, #${DIALOG_ID} .gg-empty { color: #9aa0a6; padding: 12px; }
    /* Hairline above the footer, matching Meet's menu dividers. */
    #${POPOVER_ID} .gg-foot {
      color: #9aa0a6; font-size: 12px; padding: 10px 12px 4px;
      border-top: 1px solid #444746; margin-top: 4px;
      white-space: normal; line-height: 1.4;
    }
    #${POPOVER_ID} .gg-foot.gg-error { color: #f28b82; }
    /* Once the bot is on its way the list is no longer a choice. */
    #${POPOVER_ID}.gg-locked .gg-item { cursor: default; opacity: .6; }
    #${POPOVER_ID}.gg-locked .gg-item:hover { background: transparent; }

    /* The join dialog.
       A 20px badge in the corner is the right home for ongoing status and the
       wrong place to ASK a question — it was missed entirely. This is a real
       modal, in Meet's own dialog shape, shown once just after joining. */
    #${DIALOG_ID}-scrim {
      position: fixed; inset: 0; z-index: 2147483100;
      background: rgba(0,0,0,.55);
      display: flex; align-items: center; justify-content: center;
      font-family: "Google Sans", Roboto, -apple-system, sans-serif;
    }
    #${DIALOG_ID} {
      background: #2d2f31; color: #e3e3e3;
      border-radius: 28px; padding: 24px;
      width: min(420px, calc(100vw - 48px));
      box-shadow: 0 4px 8px 3px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.55);
    }
    #${DIALOG_ID} h2 {
      margin: 0 0 6px; font-size: 22px; font-weight: 400; color: #e3e3e3;
    }
    #${DIALOG_ID} .gg-sub {
      margin: 0 0 16px; font-size: 14px; color: #c4c7c5; line-height: 1.45;
    }
    #${DIALOG_ID} .gg-list { max-height: 236px; overflow-y: auto; margin: 0 -8px; }
    #${DIALOG_ID} .gg-actions {
      display: flex; justify-content: flex-end; align-items: center;
      gap: 4px; margin-top: 20px; flex-wrap: wrap;
    }
    #${DIALOG_ID} .gg-btn {
      border: 0; border-radius: 999px; cursor: pointer;
      font-family: inherit; font-size: 14px; font-weight: 500;
      padding: 10px 16px; background: transparent; color: #a8c7fa;
      /* Three actions in one row is tight at this width — Material text
         buttons are single-line by definition, and letting them wrap mid-label
         turned every one into a two-line block. */
      white-space: nowrap;
    }
    #${DIALOG_ID} .gg-btn:hover { background: rgba(168,199,250,.08); }
    #${DIALOG_ID} .gg-btn.gg-primary {
      background: #a8c7fa; color: #062e6f; padding: 10px 24px; margin-left: 4px;
    }
    #${DIALOG_ID} .gg-btn.gg-primary:hover { background: #c2ddff; }
    #${DIALOG_ID} .gg-btn.gg-primary:disabled {
      background: #3c4043; color: #80868b; cursor: default;
    }
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

  // The ring means "something is happening that you are waiting on" — which
  // includes the bot travelling to the call, not just our own request.
  const working =
    button.disabled ||
    (state.phase === "sent" &&
      // Once the bot is visibly in the call there is nothing left to wait for.
      !state.inRoom &&
      ["DISPATCHING", "JOINING", "WAITING_ADMIT", "UPLOADING"].includes(state.botStatus ?? ""));

  if (working) {
    const ring = document.createElement("span");
    ring.className = "gg-ring";
    button.appendChild(ring);
  }

  const dot = document.createElement("span");
  dot.className = "gg-dot" + dotClass();
  button.appendChild(dot);

  button.title = `Glitchgrab · ${statusLine()}`;
  button.setAttribute("aria-label", button.title);
}

/**
 * The bot's phase, in the operator's words.
 *
 * "Waiting to be let in" is the whole reason this is worth polling: it is the
 * only state that needs a human to do something, and it is indistinguishable
 * from "recording" if all we report is what we asked for.
 */
function botPhaseLabel(): string | null {
  const project =
    state.repos.find((r) => r.id === state.repoId)?.fullName ?? "no project yet";

  // Seen in the call — that outranks a status that has not arrived yet.
  if (state.inRoom && state.botStatus !== "UPLOADING" && state.botStatus !== "DONE") {
    return `Recording · ${project}`;
  }

  switch (state.botStatus) {
    case "DISPATCHING":
      return "Sending the bot…";
    case "JOINING":
      return "Bot is joining the call…";
    case "WAITING_ADMIT":
      return "Bot is knocking — admit it in Meet";
    case "RECORDING":
      return `Recording · ${project}`;
    case "UPLOADING":
      return "Finishing up — uploading the recording";
    case "DONE":
      return `Recorded · ${project}`;
    case "FAILED":
      return `Bot failed: ${state.message || "unknown error"}`;
    default:
      return null;
  }
}

function statusLine(): string {
  const project = state.repos.find((r) => r.id === state.repoId)?.fullName;

  if (state.phase === "error") return state.message;
  if (state.phase === "loading") return state.message;
  if (state.phase === "sending") return `Sending the bot to ${project ?? "your project"}…`;
  if (state.phase === "sent") return botPhaseLabel() ?? "Bot is on its way…";
  return "Pick a project to start recording";
}

function dotClass(): string {
  if (state.phase === "error") return " bad";
  if (state.phase === "loading" || state.phase === "sending") return " busy";

  if (state.phase === "sent") {
    // Amber until the bot is actually in the room. Going red on dispatch is
    // what made a bot stuck outside the call look like a bot recording it.
    if (state.botStatus === "RECORDING" || state.inRoom) return " live";
    if (state.botStatus === "FAILED") return " bad";
    if (state.botStatus === "DONE" || state.botStatus === "UPLOADING") return " done";
    return " busy";
  }

  // Idle with nothing chosen: neutral, not green. Green reads as "handled",
  // and nothing is being recorded until a project is picked.
  return state.repoId ? "" : " idle";
}

/**
 * Split "owner/name" and highlight the matched run.
 *
 * Built with text nodes rather than innerHTML: repo names come from the server
 * and this renders inside a live Google Meet session.
 *
 * Shared by the hover picker and the join dialog so the two can never drift
 * into showing the same project differently.
 */
function repoLabel(repo: Repo, query: string): HTMLElement {
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

/** Keystrokes must not reach Meet: bare `d` mutes the mic, `e` the camera. */
function shieldKeys(input: HTMLInputElement) {
  input.addEventListener("keydown", (e) => e.stopPropagation());
  input.addEventListener("keypress", (e) => e.stopPropagation());
  input.addEventListener("keyup", (e) => e.stopPropagation());
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
  shieldKeys(search);
  panel.appendChild(search);

  const list = document.createElement("div");
  list.className = "gg-list";
  list.setAttribute("role", "radiogroup");
  list.setAttribute("aria-label", "Record this call to");
  panel.appendChild(list);

  // Only a dispatch in flight locks the list. Once the bot is recording the
  // list stays live, because picking again re-files the recording.
  if (state.phase === "sending") panel.classList.add("gg-locked");

  const foot = document.createElement("div");
  foot.className = "gg-foot";
  // Say what a click will do. The error text in particular is the only thing
  // that explains why nothing is recording, and a tooltip on a 20px dot is not
  // where anyone will find it — so it lives in the panel.
  if (state.phase === "error") foot.classList.add("gg-error");
  foot.textContent =
    state.phase === "sending"
      ? "Sending the bot…"
      : state.phase === "sent"
        ? `${botPhaseLabel() ?? "Bot is on its way"} · pick a project to file it`
        : state.phase === "error"
          ? `Failed: ${state.message} · click a project to try again`
          : "Click a project and the bot joins to record it";
  panel.appendChild(foot);

  let matches: Repo[] = [];
  let active = 0;

  /**
   * Picking a project is what starts — or re-files — the recording.
   *
   * The two steps were always one intention: nobody opens this list except to
   * record. Splitting them left the operator having picked a project with
   * nothing visibly happening, unsure whether the bot was coming.
   *
   * Once a bot is already on the call, a second pick does NOT send a second bot
   * (the client would watch two notetakers arrive). It re-files the recording
   * in progress, so a wrong pick is fixable without losing the first minutes.
   */
  function choose(repo: Repo) {
    if (state.phase === "sending") return;

    const previous = state.repoId;
    state.repoId = repo.id;
    void send({ type: "MEET_REMEMBER_REPO", repoId: repo.id });
    closePopover();

    if (state.phase === "sent" && state.meetingId) {
      if (previous === repo.id) return;
      void refileMeeting(repo);
      return;
    }

    void sendBot();
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
      item.setAttribute("role", "radio");
      item.setAttribute("aria-checked", repo.id === state.repoId ? "true" : "false");

      const radio = document.createElement("span");
      radio.className = "gg-radio" + (repo.id === state.repoId ? " on" : "");
      item.appendChild(radio);
      item.appendChild(repoLabel(repo, query));

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

  // Above the button by default — it sits on the bottom bar — and below only
  // when there is no room above.
  const anchor = root.getBoundingClientRect();
  const box = panel.getBoundingClientRect();
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - box.width - 8));
  const above = anchor.top - box.height - 12;
  const below = anchor.bottom + 12;
  const openDownward = above < 8;
  // Clamped both ways so a tall list slides rather than overflowing offscreen.
  const top = Math.max(8, Math.min(openDownward ? below : above, window.innerHeight - box.height - 8));

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;

  search.focus({ preventScroll: true });
}


/**
 * "Record this meeting?" — asked once, just after joining.
 *
 * The badge by the control bar is the right home for ongoing status and the
 * wrong place to ask a question: at 20px in the corner it was simply never
 * seen, and calls went unrecorded because nobody knew there was a decision to
 * make. A modal is the honest shape for a question that has to be answered
 * early or not at all — and it is dismissible, because sometimes you really do
 * just want to join the call.
 */
function openRecordDialog() {
  if (document.getElementById(`${DIALOG_ID}-scrim`)) return;
  if (!state.repos.length) return;

  closePopover();

  const scrim = document.createElement("div");
  scrim.id = `${DIALOG_ID}-scrim`;

  const dialog = document.createElement("div");
  dialog.id = DIALOG_ID;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Record this meeting?");

  const title = document.createElement("h2");
  title.textContent = "Record this meeting?";
  dialog.appendChild(title);

  const sub = document.createElement("p");
  sub.className = "gg-sub";
  sub.textContent =
    "Glitchgrab sends a bot to record and transcribe the call. Pick the project it belongs to.";
  dialog.appendChild(sub);

  const search = document.createElement("input");
  search.className = "gg-search";
  search.type = "text";
  search.placeholder = "Search projects…";
  search.spellcheck = false;
  shieldKeys(search);
  dialog.appendChild(search);

  const list = document.createElement("div");
  list.className = "gg-list";
  list.setAttribute("role", "radiogroup");
  dialog.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "gg-actions";

  const dismiss = document.createElement("button");
  dismiss.className = "gg-btn";
  dismiss.textContent = "Don't record";

  /**
   * Record with no project attached.
   *
   * A first call about a prospect, or an idea with no repo behind it, is
   * exactly when this is worth recording and exactly when there is nothing
   * correct to file it under. Forcing a choice here means either not recording
   * it or filing it somewhere wrong and hoping to remember — both lose the
   * conversation. It can be filed later from the badge or the Calls page.
   */
  const unfiled = document.createElement("button");
  unfiled.className = "gg-btn";
  unfiled.textContent = "No project yet";

  const start = document.createElement("button");
  start.className = "gg-btn gg-primary";
  start.textContent = "Start recording";
  // Nothing is pre-selected, so there is nothing to start until they choose.
  start.disabled = true;

  actions.append(dismiss, unfiled, start);
  dialog.appendChild(actions);

  let picked: Repo | null = null;
  let matches: Repo[] = [];
  let active = 0;

  function close() {
    scrim.remove();
    document.removeEventListener("keydown", onKey, true);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!matches.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
      paint();
    } else if (e.key === "Enter" && !start.disabled) {
      e.preventDefault();
      confirm();
    }
  }

  function confirm() {
    if (!picked) return;
    const repo = picked;
    close();

    state.repoId = repo.id;
    void send({ type: "MEET_REMEMBER_REPO", repoId: repo.id });
    void sendBot();
  }

  function paint() {
    const query = search.value.trim().toLowerCase();
    matches = query
      ? state.repos.filter((r) => r.fullName.toLowerCase().includes(query))
      : state.repos;
    if (active >= matches.length) active = Math.max(0, matches.length - 1);

    list.textContent = "";

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "gg-empty";
      empty.textContent = "No projects match";
      list.appendChild(empty);
      return;
    }

    matches.forEach((repo, index) => {
      const item = document.createElement("div");
      item.className = "gg-item" + (index === active ? " active" : "");
      item.setAttribute("role", "radio");
      item.setAttribute("aria-checked", picked?.id === repo.id ? "true" : "false");

      const radio = document.createElement("span");
      radio.className = "gg-radio" + (picked?.id === repo.id ? " on" : "");
      item.appendChild(radio);
      item.appendChild(repoLabel(repo, query));

      item.addEventListener("click", () => {
        picked = repo;
        active = index;
        start.disabled = false;
        paint();
      });
      // Double-click is the impatient path through a two-step dialog.
      item.addEventListener("dblclick", () => {
        picked = repo;
        confirm();
      });

      list.appendChild(item);
    });

    list.children[active]?.scrollIntoView({ block: "nearest" });
  }

  search.addEventListener("input", () => {
    active = 0;
    paint();
  });
  dismiss.addEventListener("click", close);
  unfiled.addEventListener("click", () => {
    close();
    state.repoId = null;
    void sendBot({ unfiled: true });
  });
  start.addEventListener("click", confirm);
  // Clicking the backdrop dismisses; clicking inside must not.
  scrim.addEventListener("click", (e) => {
    if (e.target === scrim) close();
  });
  dialog.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("keydown", onKey, true);

  scrim.appendChild(dialog);
  document.body.appendChild(scrim);
  paint();
  search.focus({ preventScroll: true });

  log("asked whether to record this call");
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

async function sendBot(options?: { unfiled?: boolean }) {
  // Unfiled is a deliberate choice, not a missing one — everything else still
  // needs a project before it can start.
  if (!state.repoId && !options?.unfiled) return;

  state.phase = "sending";
  state.message = "";
  render();

  const result = await send<{ ok: boolean; error?: string; meetingId?: string | null }>({
    type: "MEET_SEND_BOT",
    repoId: options?.unfiled ? null : state.repoId,
    meetUrl: location.href.split("?")[0],
    title: document.title === "Meet" ? null : document.title,
  });

  if (result?.ok) {
    state.phase = "sent";
    state.meetingId = result.meetingId ?? null;
    state.botStatus = "DISPATCHING";
    state.message = "";
    startStatusPoll();
  } else if (result?.meetingId) {
    // Refused because this call is already being recorded. That is not a
    // failure to report — it is the recording we should have been showing.
    state.phase = "sent";
    state.meetingId = result.meetingId;
    state.message = "";
    log(`this call is already being recorded — following ${result.meetingId}`);
    startStatusPoll();
  } else {
    state.phase = "error";
    state.message = result?.error ?? "Could not send the bot";
  }
  render();
}

/** Move an in-progress recording to another project. The bot is not disturbed. */
async function refileMeeting(repo: Repo) {
  if (!state.meetingId) return;
  log(`re-filing this recording under ${repo.fullName}`);

  const result = await send<{ ok: boolean; error?: string }>({
    type: "MEET_RETARGET",
    meetingId: state.meetingId,
    repoId: repo.id,
  });

  if (!result?.ok) {
    state.phase = "error";
    state.message = result?.error ?? "Could not move the recording";
  }
  render();
}

/**
 * Is our bot visibly in this call?
 *
 * Read straight from Meet's own DOM, because it is the one signal that cannot
 * fail: the operator can see the bot in the participant list, so the badge has
 * no business claiming otherwise while it waits for a status callback that may
 * never arrive (a bot on a network that cannot reach Glitchgrab still joins,
 * and still shows up here).
 *
 * Matched loosely on purpose — the deployed bot's display name comes from
 * MEET_BOT_NAME and has already been both "Notetaker" and "NoteMaker".
 */
function botInRoom(): boolean {
  const nodes = document.querySelectorAll<HTMLElement>(
    "[data-participant-id], [data-self-name], [aria-label], div, span"
  );

  for (const node of nodes) {
    // Leaf nodes only: a container's textContent includes every name in the
    // call, which would match as soon as anyone at all was present.
    if (node.childElementCount > 0) continue;
    const text = node.textContent?.trim();
    if (!text || text.length > 40) continue;
    if (/glitchgrab/i.test(text)) return true;
  }
  return false;
}

let statusTimer: ReturnType<typeof setInterval> | null = null;
/** When the bot's current phase was first seen — the basis for calling it stuck. */
let phaseSince = 0;

/**
 * How long a bot may stay in a pre-admission phase before we stop implying
 * progress.
 *
 * Joining a call takes seconds. A bot still "joining" three minutes later is
 * not slow, it is not coming — and a spinner that never stops spinning is
 * worse than an error, because it reads as "handled" right up until someone
 * goes looking for a recording that was never made.
 */
const PHASE_STUCK_MS = 3 * 60 * 1000;

/**
 * Follow the bot's real progress.
 *
 * Everything before this reported what we had *asked* for. A bot that was
 * dispatched but never admitted looked exactly like one that was recording, so
 * the operator's only signal that a client call went unrecorded was finding no
 * transcript afterwards. The server knows; ask it.
 */
function startStatusPoll() {
  if (statusTimer) clearInterval(statusTimer);
  if (!state.meetingId) return;
  phaseSince = Date.now();

  const tick = async () => {
    if (!state.meetingId) return;

    const result = await send<{
      ok: boolean;
      botStatus?: string | null;
      botError?: string | null;
      error?: string;
    }>({ type: "MEET_MEETING_STATUS", meetingId: state.meetingId });

    // A failed poll says nothing about the recording — the bot may be fine and
    // the network briefly not. Leave the last known phase alone and try again.
    if (!result?.ok) return;

    const next = result.botStatus ?? null;

    // Nothing has moved for too long. The usual cause is a bot that cannot
    // reach us at all — it is in the call, recording into nothing, and no
    // status it posts will ever arrive.
    const preAdmit = ["DISPATCHING", "JOINING", "WAITING_ADMIT"].includes(next ?? "");

    // The bot is in the room but its status has not caught up. Believe the
    // room: it is recording, whatever the callback managed to deliver.
    if (preAdmit && botInRoom()) {
      if (!state.inRoom) {
        state.inRoom = true;
        state.phase = "sent";
        state.message = "";
        log("bot is visible in the participant list — showing it as recording");
        render();
      }
      return;
    }
    state.inRoom = false;

    if (next === state.botStatus && preAdmit && Date.now() - phaseSince > PHASE_STUCK_MS) {
      if (state.phase !== "error") {
        state.phase = "error";
        state.message =
          next === "WAITING_ADMIT"
            ? "Bot is still waiting to be admitted"
            : "Bot never reported in — it may not be able to reach Glitchgrab";
        log(`bot stuck in ${next} for over ${PHASE_STUCK_MS / 1000}s`);
        render();
      }
      return;
    }

    if (next !== state.botStatus) {
      state.botStatus = next;
      state.message = result.botError ?? "";
      phaseSince = Date.now();
      // Recovered on its own after we had given up on it.
      if (state.phase === "error") state.phase = "sent";
      log(`bot status → ${next ?? "unknown"}${result.botError ? ` (${result.botError})` : ""}`);
      render();
      // Keep an open picker's footer honest about the phase it is describing.
      if (document.getElementById(POPOVER_ID)) openPopover();
    }

    // Nothing more will change once it has finished either way.
    if (next === "DONE" || next === "FAILED") stopStatusPoll();
  };

  void tick();
  statusTimer = setInterval(() => void tick(), 5000);
}

function stopStatusPoll() {
  if (statusTimer) clearInterval(statusTimer);
  statusTimer = null;
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
function findJoinButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '[aria-label*="join now" i], [aria-label*="ask to join" i], [jsname="Qx7uuf"]'
  );
}

let lastInCall: boolean | null = null;

function isInCall(): boolean {
  // Several spellings, because Meet's label for the hang-up control varies by
  // layout and locale ("Leave call", "Leave the call", "End call"). Matching a
  // single exact string meant one redesign silently removed the button, with
  // the removal looking identical to "the extension broke".
  const leave = document.querySelector(
    '[aria-label*="leave call" i], [aria-label*="leave the call" i],' +
      '[aria-label*="end call" i], [aria-label*="hang up" i]'
  );

  // Fallback: a lobby always offers a way IN. If there's a mic control and no
  // join affordance, we are already inside the call whatever the button is
  // called this week.
  const joining = findJoinButton();
  const inCall = Boolean(leave) || (Boolean(findMicButton()) && !joining);

  if (inCall !== lastInCall) {
    lastInCall = inCall;
    log(`in-call = ${inCall} (leaveButton=${Boolean(leave)}, joinButton=${Boolean(joining)})`);
  }
  return inCall;
}

function findMicButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '[aria-label*="microphone" i], [aria-label*="Turn off mic" i], [aria-label*="Turn on mic" i]'
  );
}

/** The red hang-up button. Unlike the mic, it exists exactly once, in the bar. */
function findLeaveButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '[aria-label*="leave call" i], [aria-label*="leave the call" i],' +
      '[aria-label*="end call" i], [aria-label*="hang up" i]'
  );
}

/**
 * The grey control group that holds mic, camera and the rest.
 *
 * Anchored on the hang-up button, NOT the microphone. Opening the People panel
 * puts a per-participant mic indicator into the sidebar, and those come first
 * in DOM order — so `querySelector` returned the sidebar's mic, the climb found
 * the sidebar instead of the toolbar, and the button was positioned against the
 * wrong element entirely. There is only ever one way to leave a call.
 */
function findControlGroup(): HTMLElement | null {
  // In-call only. Asking in the lobby put the question in front of someone who
  // is still deciding whether to join at all, next to Google's own Join button
  // — the one control on that screen that must never be competed with.
  if (!isInCall()) return null;

  const anchor = findLeaveButton() ?? findMicButton();
  if (!anchor) return null;

  let group: HTMLElement | null = anchor.parentElement;
  for (let depth = 0; group && depth < 6; depth++) {
    // 5, not 3: the hang-up button sits in a small wrapper of its own, and a
    // threshold of 3 stopped the climb there instead of at the real bar.
    if (group.querySelectorAll("button, [role='button']").length >= 5) return group;
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
/** Last thing ensureMounted logged, so a 4-per-second check doesn't spam. */
let lastMountLog = "";

/** The picker opens by itself once per call, never again — nagging is not a nudge. */
let promptedInCall = false;

function mountLog(message: string) {
  if (message === lastMountLog) return;
  lastMountLog = message;
  log(message);
}

/**
 * Put the button on `body` and follow the control bar, rather than living
 * inside it.
 *
 * Injecting into Meet's own control group kept losing: Meet rebuilds that
 * subtree on every layout change — opening the People panel, a participant
 * joining, the window resizing — and each rebuild took our button with it.
 * Re-docking after the fact turned into a race we kept losing in new ways
 * (first-child churn, 0×0 measurements mid-animation, the observer reacting to
 * our own repair). Every other extension that survives here, tl;dv included,
 * does the same thing: a fixed-position element of its own, positioned next to
 * the bar. Meet cannot tear out what it doesn't own.
 *
 * The cost is that the button sits just outside the grey card instead of
 * inside it. Being reliably present beats being perfectly inline.
 */
function ensureMounted() {
  const bar = findControlGroup();

  // Not in the call (or Meet's controls aren't rendered): show nothing.
  if (!bar) {
    mountLog(
      `no control bar — inCall=${isInCall()} mic=${Boolean(findMicButton())}` +
        (root ? " (hiding the button)" : "")
    );
    document.getElementById(PILL_ID)?.remove();
    closePopover();
    root = null;
    return;
  }

  const rect = bar.getBoundingClientRect();
  // Mid-animation the bar can measure zero; skip this frame rather than park
  // the button at 0,0.
  if (!rect.width || !rect.height) return;

  if (!document.getElementById(`${PILL_ID}-style`)) {
    const style = document.createElement("style");
    style.id = `${PILL_ID}-style`;
    style.textContent = styles();
    document.head.appendChild(style);
  }

  let button = document.getElementById(PILL_ID) as HTMLButtonElement | null;
  if (!button) {
    mountLog("creating the button on the page body");

    button = document.createElement("button");
    button.id = PILL_ID;
    button.addEventListener("click", () => {
      // Nothing chosen yet, so there is nothing to start — ask properly
      // instead of swallowing the click.
      if (!state.repoId) {
        closePopover();
        openRecordDialog();
        return;
      }
      closePopover();
      void sendBot();
    });
    button.addEventListener("mouseenter", () => {
      if (popoverTimer) clearTimeout(popoverTimer);
      openPopover();
    });
    button.addEventListener("mouseleave", scheduleClosePopover);

    document.body.appendChild(button);
    root = button;
    render();

    // If the project lookup is still sleeping off an earlier failure, this is
    // the moment to retry it.
    if (state.phase === "loading") pokeRetry();

    // Ask once, just after joining — the button mounts the moment "Leave call"
    // exists, which is exactly when recording becomes a live decision. A
    // control nobody notices is the same as no control at all, and this is the
    // one question that has to be answered early or not at all.
    if (!promptedInCall) {
      promptedInCall = true;
      setTimeout(() => {
        if (isInCall() && state.phase === "idle" && !state.repoId) openRecordDialog();
      }, 1200);
    }
  } else if (root !== button) {
    // Same node, new script state (or vice versa) — keep the two in step.
    root = button;
    render();
  } else {
    mountLog("mounted and in place");
  }

  // Always a circle the size of one of Meet's own controls.
  //
  // An earlier version grew into a labelled pill whose text changed with the
  // bot's phase — so the control resized under the pointer mid-call, and at
  // 48px the label wrapped to three lines inside a circle. The badge's job is
  // status at a glance; the words belong in the dialog and the tooltip.
  const gauge = findLeaveButton() ?? findMicButton();
  const size = Math.round(gauge?.getBoundingClientRect().height || 0) || 48;
  const width = size;

  button.style.setProperty("width", `${size}px`, "important");
  button.style.setProperty("height", `${size}px`, "important");
  button.style.setProperty("border-radius", "50%", "important");
  button.style.setProperty("padding", "0", "important");

  // In call: right of the bar. tl;dv parks its own pill on the left and the two
  // overlapped; the gap on the right is empty in every layout.
  const left = Math.min(rect.right + 12, window.innerWidth - width - 8);
  button.style.setProperty("left", `${Math.round(left)}px`, "important");
  button.style.setProperty(
    "top",
    `${Math.round(rect.top + (rect.height - size) / 2)}px`,
    "important"
  );
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

  // The bar moves without any DOM change at all when the window resizes or a
  // side panel animates open, so geometry needs its own triggers.
  window.addEventListener("resize", () => {
    try { ensureMounted(); } catch { /* never break the page */ }
  });
  setInterval(ensureMounted, 1000);
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

    let woken = false;
    await Promise.race([
      wait(backoff),
      new Promise<void>((resolve) => {
        wakeRetry = () => {
          woken = true;
          resolve();
        };
      }),
    ]);
    wakeRetry = null;

    // A wake means the situation changed (the call was joined), so start the
    // backoff over rather than punishing the new attempt for the old failures.
    backoff = woken ? RETRY_MS : Math.min(backoff * 1.5, RETRY_MAX_MS);
  };

  for (;;) {
    if (!/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(location.href)) {
      // Not an error — the operator is on the landing page or a lobby URL, so
      // hold the initial wording rather than shouting a failure at them.
      log(`not a call URL (${location.href}) — waiting`);
      await wait(RETRY_MS);
      continue;
    }

    const askedAt = Date.now();
    log("asking the background for this call's project…");

    const resolved = await send<{
      ok: boolean;
      repos?: Repo[];
      suggested?: { repoId: string; repoFullName: string; source: string } | null;
      /** A bot already recording this call — set when the tab was reloaded. */
      active?: {
        meetingId: string;
        repoId: string;
        repoFullName: string;
        botStatus: string | null;
      } | null;
      lastRepoId?: string | null;
      /** True when the repo list came from cache because the server was slow. */
      stale?: boolean;
      error?: string;
    }>({ type: "MEET_RESOLVE_PROJECT", meetUrl: location.href.split("?")[0] });

    log(
      `background replied in ${Date.now() - askedAt}ms: ` +
        (resolved
          ? `ok=${resolved.ok} repos=${resolved.repos?.length ?? 0}` +
            (resolved.stale ? " (cached)" : "") +
            (resolved.error ? ` error=${resolved.error}` : "")
          : "no reply")
    );

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

    // Nothing is pre-selected — not the calendar match, not the last project
    // used. A pre-filled choice makes "start recording" a single click that
    // files a client conversation wherever the previous one went, and the
    // operator only finds out when they go looking for the transcript.
    // Deciding is the point.
    state.repoId = null;

    // Already recording? Adopt it rather than starting over.
    //
    // The button's state lives in the page, so reloading the tab — or opening
    // the call in a second tab — used to forget the bot was already in the
    // room and ask again from scratch. The obvious answer to that question is
    // to pick a project, which is a request for a SECOND bot, in front of the
    // client.
    if (resolved.active) {
      state.repoId = resolved.active.repoId;
      state.meetingId = resolved.active.meetingId;
      state.botStatus = resolved.active.botStatus;
      state.phase = "sent";
      state.message = "";
      // Nothing to ask: this call is handled.
      promptedInCall = true;
      render();
      startStatusPoll();
      log(`adopted the recording already running (${resolved.active.repoFullName})`);
      mounting = false;
      return;
    }

    state.phase = "idle";
    state.message = "";
    render();
    log(`ready (${state.repos.length} projects, none pre-selected)`);

    // The projects usually arrive AFTER the button mounts, so the timer that
    // fires on joining often found nothing to offer yet. Whichever of the two
    // finishes last does the asking; `promptedInCall` keeps it to once.
    if (isInCall() && !promptedInCall && !state.repoId) {
      promptedInCall = true;
      openRecordDialog();
    }
    mounting = false;
    return;
  }
}
