import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ReportDialog } from "@glitchgrab/report-ui";
import type {
  ReportFn,
  ReportResult,
  ReportType,
  ReportReporter,
} from "@glitchgrab/report-ui";

interface PendingReport {
  sessionId: string;
  // The backend the login session actually lives in (dev vs prod) — every
  // fetch below must target THIS, not a hardcoded origin, or it 404s against
  // whichever environment you weren't logged into.
  apiBase: string;
  screenshotDataUrl: string | null;
  pageUrl: string | null;
  pageTitle: string | null;
  targetWindowId: number | null;
  /** Recent console errors from the reported page, newest last. */
  consoleErrors?: string[];
  /** Browser, platform and viewport of the tab being reported. */
  client?: { userAgent?: string; platform?: string; viewport?: string };
}

interface RepoOption {
  id: string;
  fullName: string;
}

function ProjectPicker({
  repos,
  repoId,
  onChange,
}: {
  repos: RepoOption[];
  repoId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const selected = repos.find((r) => r.id === repoId);
  const matches = query.trim()
    ? repos.filter((r) => r.fullName.toLowerCase().includes(query.trim().toLowerCase()))
    : repos;

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (repo: RepoOption) => {
    onChange(repo.id);
    setOpen(false);
    setQuery("");
    setActive(0);
  };

  const name = (full: string) => full.split("/").pop() ?? full;
  const owner = (full: string) => (full.includes("/") ? full.split("/")[0] : "");

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <div style={{ fontSize: 11, color: "#9aa0a6", marginBottom: 4 }}>Project</div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, padding: "9px 12px", background: "#141414", color: "#e5e5e5",
          border: `1px solid ${open ? "#3b82f6" : "#2a2a2a"}`, borderRadius: 8,
          fontSize: 13, cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? name(selected.fullName) : "Choose a project"}
          {selected && owner(selected.fullName) && (
            <span style={{ color: "#6b7280" }}>{`  ${owner(selected.fullName)}`}</span>
          )}
        </span>
        <span style={{ color: "#6b7280", fontSize: 10 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 10,
            background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,.6)", overflow: "hidden",
          }}
        >
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (!matches.length) return;
                setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (matches[active]) pick(matches[active]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
            placeholder="Search projects…"
            spellCheck={false}
            style={{
              width: "100%", boxSizing: "border-box", padding: "9px 12px",
              background: "#0f0f0f", color: "#e5e5e5", border: 0,
              borderBottom: "1px solid #2a2a2a", fontSize: 13, outline: "none",
            }}
          />

          <div style={{ maxHeight: 220, overflowY: "auto", padding: 4 }}>
            {matches.length === 0 && (
              <div style={{ padding: 12, fontSize: 12, color: "#6b7280" }}>No projects match</div>
            )}
            {matches.map((repo, i) => (
              <div
                key={repo.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(repo)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                  background: i === active ? "#1f1f1f" : "transparent",
                }}
              >
                <span style={{ width: 14, color: "#3b82f6", fontSize: 12 }}>
                  {repo.id === repoId ? "✓" : ""}
                </span>
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                  <span style={{ fontSize: 13, color: "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name(repo.fullName)}
                  </span>
                  <span style={{ fontSize: 10, color: "#6b7280" }}>{owner(repo.fullName)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [pending, setPending] = useState<PendingReport | null>(null);
  const [repos, setRepos] = useState<RepoOption[] | null>(null);
  const [repoId, setRepoId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [reporter, setReporter] = useState<ReportReporter | null>(null);

  useEffect(() => {
    chrome.storage.local.get("gg_pending_report", ({ gg_pending_report }) => {
      const p = gg_pending_report as PendingReport | undefined;
      if (!p?.sessionId) {
        setError("No active login — open a QA link or the dashboard first, then try again.");
        return;
      }
      setPending(p);
      fetch(`${p.apiBase}/api/v1/extension/repos?sessionId=${encodeURIComponent(p.sessionId)}`)
        .then(async (r) => ({ status: r.status, data: await r.json().catch(() => null) }))
        .then(({ status, data }) => {
          if (!data?.success) {
            // The server does not recognise our session — it ended, or this is
            // a different backend than the one it was minted against (a reset
            // dev database is the usual cause). Drop it so the next dashboard
            // visit mints a fresh one, and say what to do about it.
            if (status === 401 || status === 404) {
              try {
                chrome.runtime.sendMessage({ type: "SESSION_DEAD", reason: data?.error });
              } catch { /* worker asleep */ }
              setError(
                "Your Glitchgrab session has expired. Open your Glitchgrab dashboard once to sign in again, then try ⌘⇧G."
              );
              return;
            }
            setError(data?.error ?? "Couldn't load your repos");
            return;
          }
          const list = data.data as RepoOption[];
          setRepos(list);
          // One repo means there is no decision to make — pick it and don't
          // render a menu whose only entry is the answer.
          const saved = localStorage.getItem("gg_last_repo_id");
          setRepoId(saved && list.some((r) => r.id === saved) ? saved : (list[0]?.id ?? ""));
        })
        .catch(() => setError("Couldn't reach Glitchgrab — check your connection"));

      // Identity is resolved server-side from the session id, never read from
      // anything local — the same rule the tester-auth deep link follows. A
      // failure here leaves the footer anonymous rather than blocking the report.
      fetch(`${p.apiBase}/api/v1/extension/session/${encodeURIComponent(p.sessionId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data?.success) return;
          const { testerName, testerEmail, isTester } = data.data as {
            testerName?: string | null;
            testerEmail?: string | null;
            isTester?: boolean;
          };
          setReporter({
            name: testerName ?? null,
            email: testerEmail ?? null,
            role: isTester ? "tester" : null,
          });
        })
        .catch(() => {
          // Anonymous footer is the honest fallback
        });
    });
  }, []);

  const report: ReportFn = async (
    type: ReportType,
    description: string,
    metadata?: Record<string, string>
  ): Promise<ReportResult | null> => {
    if (!pending || !repoId) return { success: false, message: "Pick a repo first" };
    try {
      const res = await fetch(`${pending.apiBase}/api/v1/extension/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: pending.sessionId,
          repoId,
          type,
          description,
          // Context the reporter would otherwise have to type out, and
          // usually can't: they are describing someone else's page.
          metadata: {
            ...metadata,
            ...(pending.pageUrl ? { pageUrl: pending.pageUrl } : {}),
            ...(pending.pageTitle ? { pageTitle: pending.pageTitle } : {}),
            ...(pending.client?.userAgent ? { userAgent: pending.client.userAgent } : {}),
            ...(pending.client?.platform ? { platform: pending.client.platform } : {}),
            ...(pending.client?.viewport ? { viewport: pending.client.viewport } : {}),
            ...(pending.consoleErrors?.length
              ? { consoleErrors: pending.consoleErrors.slice(-10).join("\n") }
              : {}),
          },
        }),
      });
      const data = await res.json();
      if (!data.success) return { success: false, message: data.error };
      return { success: true, ...data.data };
    } catch {
      return { success: false, message: "Network error" };
    }
  };

  // ReportDialog stays hidden until it hears this — normally dispatched by
  // the SDK provider's openReportDialog(); we're not using that provider.
  useEffect(() => {
    if (repos === null) return;
    window.dispatchEvent(new CustomEvent("glitchgrab:open-report"));
  }, [repos]);

  const firstCapture = useRef(true);

  /**
   * The picture of the bug.
   *
   * The first one was already taken — by the background worker, before this
   * dialog existed. Re-taking it here would photograph the dialog instead of
   * the thing being reported, which is why the screenshot chip was missing:
   * the capture came back either empty or showing our own overlay.
   *
   * A deliberate retake has the same problem, so the overlay is hidden for the
   * moment the shutter fires and put back afterwards.
   */
  const captureScreenshot = async (): Promise<string | null> => {
    const preCaptured = pending?.screenshotDataUrl ?? null;

    if (firstCapture.current) {
      firstCapture.current = false;
      console.log(
        `[GG] report: pre-captured screenshot ${preCaptured ? Math.round(preCaptured.length / 1024) + "KB" : "MISSING"}`
      );
      // Normally the background already took this, before the overlay existed.
      // If that failed there is still one chance worth taking — falling through
      // means the dialog opens with no screenshot and no way to tell whether
      // capture broke or the page simply refused it.
      if (preCaptured) return preCaptured;
    }

    if (pending?.targetWindowId == null) return preCaptured;

    window.parent.postMessage({ type: "GG_REPORT_HIDE" }, "*");
    // One frame is not enough — the host page has to actually repaint without
    // us in it before the capture is taken.
    await new Promise((r) => setTimeout(r, 220));

    const dataUrl = await new Promise<string | null>((resolve) => {
      chrome.runtime.sendMessage(
        { type: "RECAPTURE_TAB", windowId: pending.targetWindowId },
        (res) => resolve(res?.dataUrl ?? null)
      );
    });

    window.parent.postMessage({ type: "GG_REPORT_SHOW" }, "*");
    return dataUrl;
  };

  // Everything below can end the dialog; the overlay in the page is listening.
  const close = () => window.parent.postMessage({ type: "GG_REPORT_CLOSE" }, "*");

  // Tell the overlay how tall we actually are.
  //
  // The iframe is a fixed box, so a short state — "session expired", "no
  // repos", the loading line — sat in the middle of a tall empty panel that
  // looked broken. Measured rather than guessed, because the dialog's height
  // changes as it moves through its own steps.


  if (error) {
    return (
      <div style={{ margin: "10vh auto 0", maxWidth: 420, background: "#141414", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
        <div style={{ fontSize: 13, color: "#f87171", lineHeight: 1.5 }}>{error}</div>
        <button
          onClick={close}
          style={{
            alignSelf: "flex-start", padding: "6px 14px", borderRadius: 999,
            border: "1px solid #2a2a2a", background: "#141414", color: "#e5e5e5",
            fontSize: 12, cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  if (!pending || repos === null) {
    return <div style={{ padding: 24, fontSize: 13, color: "#888" }}>Loading…</div>;
  }

  if (repos.length === 0) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: "#f87171" }}>
        No repos assigned to you yet — ask the org owner to add you as a tester or connect a repo.
      </div>
    );
  }

  // Which project this bug belongs to, rendered INSIDE the dialog.
  //
  // The extension can be pointed at any page, so unlike the SDK — which is
  // embedded in exactly one app — it has to ask. Asking from a panel wrapped
  // around the dialog produced two stacked cards, which reads as a broken bug
  // reporter.
  const projectField =
    repos.length > 1 ? (
      <ProjectPicker
        repos={repos}
        repoId={repoId}
        onChange={(id) => {
          setRepoId(id);
          localStorage.setItem("gg_last_repo_id", id);
        }}
      />
    ) : (
      <div style={{ fontSize: 11, color: "#9aa0a6" }}>
        Filing to <strong style={{ color: "#e5e5e5" }}>{repos[0].fullName.split("/").pop()}</strong>
        {pending.pageUrl ? ` · ${new URL(pending.pageUrl).hostname}` : ""}
      </div>
    );

  return (
    <ReportDialog
      report={report}
      captureScreenshot={captureScreenshot}
      reporter={reporter}
      headerSlot={projectField}
      onClose={close}
    />
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
