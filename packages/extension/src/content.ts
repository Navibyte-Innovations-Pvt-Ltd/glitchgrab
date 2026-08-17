import { Capture, type CaptureEvent } from "./capture";
import { mountMeetPill } from "./meet-pill";

let stopped = false; // set on context invalidation — all callbacks bail immediately

function isContextAlive(): boolean {
  if (stopped) return false;
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

// Send a captured event to the background service worker. Guarded so a dead
// extension context never throws.
function sendEvent(event: CaptureEvent) {
  if (!isContextAlive()) return;
  try {
    const p = chrome.runtime.sendMessage({ type: "CAPTURE_EVENT", event });
    p?.catch?.(() => {});
  } catch { /* context invalidated */ }
}

const capture = new Capture(sendEvent);

function cleanup() {
  if (stopped) return;
  stopped = true;
  capture.stop();
}

// ── Single-instance guard ─────────────────────────────────────
// The extension reinjects this script into already-open tabs on startup.
// If a LIVE instance already runs here, bail so we don't double-register
// listeners. Orphaned (dead-context) instances do NOT answer the ping —
// their chrome.runtime is gone — so a fresh inject correctly replaces them.
const GG_PING = "__gg_ping__";

(function bootstrap() {
  const probe = { alive: false };
  document.dispatchEvent(new CustomEvent(GG_PING, { detail: probe }));
  if (probe.alive) {
    // A live sibling already owns this page — become inert (register nothing).
    return;
  }

  // Only the ACTIVE instance answers pings. Registered after the probe check so
  // inert instances never falsely claim the page and block a later reinjection.
  document.addEventListener(GG_PING, (e) => {
    if (isContextAlive()) (e as CustomEvent<{ alive: boolean }>).detail.alive = true;
  });

  console.log("[GG] Content script active on", location.hostname);

  window.addEventListener("unhandledrejection", (event) => {
    if ((event.reason as Error)?.message?.includes("Extension context invalidated")) {
      event.preventDefault();
      cleanup();
    }
  });

  window.addEventListener("error", (event) => {
    if (event.message?.includes("Extension context invalidated")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      cleanup();
    }
  }, { capture: true });

  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "CAPTURE_START") capture.start();
      else if (msg.type === "CAPTURE_STOP") capture.stop();
      else if (msg.type === "GG_LOG") console.log("[GG-bg]", msg.text);
    });
  } catch { /* context invalidated at load */ }

  // Silent tester auto-login handshake (#297) — the /qa/<token> QA-verifier
  // page posts this to its OWN window after minting a tokenless
  // ExtensionSession server-side. This content script runs on <all_urls>, so
  // WITHOUT an origin check any site could postMessage into itself and spoof
  // a fake tester identity (session fixation / attribution poisoning) —
  // gate both the listener's existence and each message on the real origin.
  const GG_AUTH_ORIGINS = ["https://glitchgrab.dev", "http://localhost:3000"];
  if (GG_AUTH_ORIGINS.includes(window.location.origin)) {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (!GG_AUTH_ORIGINS.includes(event.origin)) return;
      const data = event.data as { source?: string; type?: string; sessionId?: string; name?: string; email?: string };
      if (data?.source !== "glitchgrab-auth" || data.type !== "GG_AUTO_LOGIN") return;
      if (!data.sessionId || !data.name) return;
      if (!isContextAlive()) return;
      try {
        chrome.runtime.sendMessage({
          type: "TESTER_AUTO_LOGIN",
          sessionId: data.sessionId,
          name: data.name,
          email: data.email,
          // The trusted origin THIS login actually came from (dev vs prod) —
          // every subsequent API call (ping/end/repos/report) must target the
          // same backend the session lives in, not a hardcoded one.
          apiBase: event.origin,
        });
      } catch { /* context invalidated */ }
    });
  }

  // CRITICAL: a page that LOADS during an active recording (new tab, or a
  // full-page navigation that tore down the previous content script) misses the
  // one-time CAPTURE_START broadcast. Ask the background if capture is active
  // and self-start so no events are lost.
  try {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (s) => {
      if (chrome.runtime.lastError) return; // background asleep / context gone
      if (s?.active) capture.start();
    });
  } catch { /* context invalidated at load */ }

  // Keep the background worker awake (or wake it) via a persistent port. Opening
  // the port wakes a sleeping MV3 worker immediately, so it connects to the
  // GlitchRecord bridge as soon as a page is open — instead of sleeping until a
  // stray event, which left the recording's first seconds uncaptured. On
  // disconnect (worker died / ext reloaded) we reconnect, which wakes it again.
  const keepBgAlive = () => {
    if (!isContextAlive()) return;
    try {
      const port = chrome.runtime.connect({ name: "gg-heartbeat" });
      port.onDisconnect.addListener(() => {
        void chrome.runtime.lastError; // swallow "receiving end" noise
        setTimeout(keepBgAlive, 1000);
      });
    } catch { /* context invalidated */ }
  };
  keepBgAlive();



  const REPORT_OVERLAY_ID = "glitchgrab-report-overlay";

  /**
   * Show the report dialog over the page.
   *
   * An iframe pointing at an extension page, rather than React injected into
   * the host document: the bug stays visible behind the dialog (a separate
   * window buries it), the dialog cannot inherit or fight the host's CSS, and
   * the host's scripts cannot read what is typed into it — this collects
   * screenshots of whatever the reporter was looking at.
   */
  function mountReportOverlay(url: string) {
    if (document.getElementById(REPORT_OVERLAY_ID)) return;

    const host = document.createElement("div");
    host.id = REPORT_OVERLAY_ID;
    // Shadow root so not one of the host page's rules can reach the backdrop.
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      iframe {
        position: fixed; inset: 0;
        width: 100vw; height: 100vh;
        border: 0; background: transparent;
        z-index: 2147483647;
      }
    `;

    const frame = document.createElement("iframe");
    frame.src = url;
    frame.allow = "clipboard-write";
    // Transparent, full-viewport, and the dialog inside draws its own backdrop
    // — an overlay of ours as well would dim the page twice, and a fixed-size
    // frame boxed the dialog into a second card.
    frame.setAttribute("allowtransparency", "true");

    shadow.append(style, frame);
    document.documentElement.appendChild(host);

    const close = () => {
      host.remove();
      window.removeEventListener("message", onMessage);
      document.removeEventListener("keydown", onEsc, true);
    };
    const onMessage = (e: MessageEvent) => {
      // Only our own frame may close it — any page can postMessage.
      if (e.source !== frame.contentWindow) return;
      const type = (e.data as { type?: string })?.type;
      if (type === "GG_REPORT_CLOSE") close();
      // Step out of frame while the dialog re-takes the screenshot, or the
      // photograph is of the dialog rather than the bug.
      if (type === "GG_REPORT_HIDE") frame.style.visibility = "hidden";
      if (type === "GG_REPORT_SHOW") frame.style.visibility = "visible";
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("keydown", onEsc, true);
  }

  // ── Report a bug from any page (⌘⇧G) ───────────────────────
  //
  // The SDK claims this shortcut inside apps that embed it. Everywhere else
  // there is nothing listening, which is exactly where a bug is hardest to
  // file: someone else's dashboard, a staging build, a video call. The
  // extension fills that gap and stands aside wherever the SDK is present.
  const GG_SDK_MARKER = "data-glitchgrab-sdk";

  /** Page errors worth attaching — the last few, newest last. */
  const consoleErrors: string[] = [];
  const MAX_CONSOLE_ERRORS = 10;

  function noteError(text: string) {
    if (!text) return;
    consoleErrors.push(text.slice(0, 500));
    if (consoleErrors.length > MAX_CONSOLE_ERRORS) consoleErrors.shift();
  }

  window.addEventListener("error", (e) => {
    noteError(e.message ? `${e.message} (${e.filename ?? "?"}:${e.lineno ?? 0})` : "Script error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e as PromiseRejectionEvent).reason;
    noteError(`Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
  });

  /**
   * Open the report dialog for this page.
   *
   * Driven by this page's own keydown, not a `chrome.commands` binding.
   * Chrome reserves ⌘⇧G on macOS (Find Previous) and silently refuses to bind
   * it — the command shows as "Not set" in chrome://extensions/shortcuts and
   * nothing ever fires. A page listener has no such restriction, and it is
   * what the SDK uses, so the shortcut behaves identically whether the page
   * embeds Glitchgrab or not.
   */
  function triggerReport() {
    // The host app embeds the SDK, which has its own dialog with the app's own
    // context. Open THAT rather than ours — and never both.
    if (document.documentElement.hasAttribute(GG_SDK_MARKER)) {
      window.dispatchEvent(new CustomEvent("glitchgrab:open-report"));
      return;
    }

    if (document.getElementById(REPORT_OVERLAY_ID)) return;
    if (!isContextAlive()) return;

    try {
      chrome.runtime.sendMessage(
        {
          type: "OPEN_REPORT",
          consoleErrors,
          client: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            viewport: `${window.innerWidth}\u00d7${window.innerHeight}`,
          },
        },
        (res: { ok?: boolean; url?: string; error?: string } | undefined) => {
          void chrome.runtime.lastError;
          if (res?.ok && res.url) mountReportOverlay(res.url);
          else console.warn("[GG] report:", res?.error ?? "no reply from the extension");
        }
      );
    } catch { /* context invalidated */ }
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (!((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "g")) return;

      // Typing in a field is not a bug report — and \u2318\u21e7G is "find previous" in
      // some editors, which we should not be stealing.
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;

      e.preventDefault();
      triggerReport();
    },
    true
  );

  // The in-Meet pill (#311). Meet is a single-page app, so the call page is
  // often reached by client-side navigation rather than a load — mount on both.
  if (location.hostname === "meet.google.com") {
    void mountMeetPill();
    window.addEventListener("popstate", () => void mountMeetPill());
  }

  // History-API navigation hooks → SPA navigations
  const onNavigate = () => capture.onNavigate(document.title);
  const origPushState = history.pushState.bind(history);
  const origReplaceState = history.replaceState.bind(history);
  history.pushState = (...args) => {
    origPushState(...args);
    onNavigate();
    if (location.hostname === "meet.google.com") void mountMeetPill();
  };
  history.replaceState = (...args) => { origReplaceState(...args); onNavigate(); };
  window.addEventListener("popstate", onNavigate);
})();
