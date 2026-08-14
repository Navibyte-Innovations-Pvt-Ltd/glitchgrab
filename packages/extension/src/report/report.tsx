import { useEffect, useState } from "react";
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
}

interface RepoOption {
  id: string;
  fullName: string;
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
        .then((r) => r.json())
        .then((data) => {
          if (!data?.success) {
            setError(data?.error ?? "Couldn't load your repos");
            return;
          }
          const list = data.data as RepoOption[];
          setRepos(list);
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
          metadata,
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

  const captureScreenshot = async (): Promise<string | null> => {
    if (pending?.targetWindowId == null) return pending?.screenshotDataUrl ?? null;
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "RECAPTURE_TAB", windowId: pending.targetWindowId },
        (res) => resolve(res?.dataUrl ?? null)
      );
    });
  };

  if (error) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: "#f87171" }}>{error}</div>
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

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>Report a bug</div>
      {pending.pageUrl && (
        <div style={{ fontSize: 11, color: "#888", wordBreak: "break-all" }}>{pending.pageUrl}</div>
      )}
      <label style={{ fontSize: 11, color: "#aaa" }}>
        Repo
        <select
          value={repoId}
          onChange={(e) => {
            setRepoId(e.target.value);
            localStorage.setItem("gg_last_repo_id", e.target.value);
          }}
          style={{
            display: "block", width: "100%", marginTop: 4, padding: 6,
            background: "#141414", color: "#e5e5e5", border: "1px solid #2a2a2a", borderRadius: 4,
          }}
        >
          {repos.map((r) => (
            <option key={r.id} value={r.id}>{r.fullName}</option>
          ))}
        </select>
      </label>
      <ReportDialog report={report} captureScreenshot={captureScreenshot} reporter={reporter} />
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
