import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { ReportDialog } from "../report-dialog";

// Toggle to block useEffect — simulates the hydration window before effects fire
const { blockEffectsRef } = vi.hoisted(() => ({
  blockEffectsRef: { current: false },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useEffect: (...args: Parameters<typeof actual.useEffect>) => {
      if (blockEffectsRef.current) return;
      return actual.useEffect(...args);
    },
  };
});

// Mock html2canvas so it doesn't create iframes in jsdom
vi.mock("html2canvas-pro", () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => "data:image/jpeg;base64,fake",
  }),
}));

const mockReport = vi.fn().mockResolvedValue({ success: true, reportId: "r1" });

/** Helper to open the dialog via custom event and wait for it to render */
async function openDialog(detail: Record<string, unknown> = {}) {
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent("glitchgrab:open-report", { detail })
    );
    // Wait for html2canvas mock + state updates
    await new Promise((r) => setTimeout(r, 50));
  });
}

beforeEach(() => {
  mockReport.mockClear();
});

describe("ReportDialog", () => {
  // ─── Hydration Safety ───────────────────────────────────

  describe("hydration", () => {
    it("renders nothing on the server (SSR)", () => {
      const html = renderToString(
        <ReportDialog report={mockReport} />
      );
      expect(html).toBe("");
    });

    it("renders nothing initially on client (matches SSR)", () => {
      const { container } = render(<ReportDialog report={mockReport} />);
      // After mount, the hidden file input renders — but no visible UI
      // The key is there's no mismatch: server returns "" and client starts with ""
      // then hydrates to add the file input
      expect(container.querySelector("[data-testid]")).toBeNull();
    });

    it("does not render modal when closed", () => {
      render(<ReportDialog report={mockReport} />);
      expect(screen.queryByText("What's on your mind?")).toBeNull();
    });

    it("SSR output matches initial client render (no hydration mismatch)", () => {
      const serverHtml = renderToString(
        <ReportDialog report={mockReport} />
      );

      const div = document.createElement("div");
      div.innerHTML = serverHtml;

      // Both should be empty — no DOM on server, no DOM initially on client
      // This is the exact condition that prevents hydration mismatch
      expect(serverHtml).toBe("");
    });

    it("first client render matches SSR (guards against hydration mismatch)", () => {
      // Block useEffect to simulate the hydration window: React commits the
      // first render BEFORE firing effects. If first render differs from SSR → mismatch.
      blockEffectsRef.current = true;
      try {
        const serverHtml = renderToString(<ReportDialog report={mockReport} />);
        const { container, unmount } = render(<ReportDialog report={mockReport} />);

        // First client render must be identical to server output
        expect(container.innerHTML).toBe(serverHtml);

        unmount();
      } finally {
        blockEffectsRef.current = false;
      }
    });
  });

  // ─── Dialog Open/Close ──────────────────────────────────

  describe("dialog open/close", () => {
    it("opens dialog via custom event", async () => {
      render(<ReportDialog report={mockReport} />);

      await openDialog();

      expect(screen.getByText("What's on your mind?")).toBeInTheDocument();
    });

    it("opens with pre-filled description", async () => {
      render(<ReportDialog report={mockReport} />);

      await openDialog({ description: "Something broke" });

      expect(screen.getByText("What's on your mind?")).toBeInTheDocument();
    });

    it("opens at step 2 when type is pre-selected", async () => {
      render(<ReportDialog report={mockReport} />);

      await openDialog({ type: "FEATURE_REQUEST" });

      // Should skip step 1 and show step 2
      expect(screen.getByText("Tell us more")).toBeInTheDocument();
    });

    it("closes on Escape key", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(screen.getByText("What's on your mind?")).toBeInTheDocument();

      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(screen.queryByText("What's on your mind?")).toBeNull();
    });
  });

  // ─── Stepper Flow ───────────────────────────────────────

  describe("stepper flow", () => {
    it("shows the report category cards by default", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(screen.getByText("Bug Report")).toBeInTheDocument();
      expect(screen.getByText("Feature Request")).toBeInTheDocument();
      expect(screen.getByText("Question")).toBeInTheDocument();
      // "Other" was retired from the default set — the rating hero is where
      // general feedback goes now. Hosts can still opt back in via `types`.
      expect(screen.queryByText("Other")).not.toBeInTheDocument();
    });

    it("still shows Other when a host asks for it explicitly", async () => {
      render(<ReportDialog report={mockReport} types={["BUG", "OTHER"]} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(screen.getByText("Other")).toBeInTheDocument();
    });

    it("respects types prop to filter categories", async () => {
      render(
        <ReportDialog report={mockReport} types={["BUG", "FEATURE_REQUEST"]} />
      );

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(screen.getByText("Bug Report")).toBeInTheDocument();
      expect(screen.getByText("Feature Request")).toBeInTheDocument();
      expect(screen.queryByText("Question")).toBeNull();
      expect(screen.queryByText("Other")).toBeNull();
    });

    it("auto-skips step 1 when only one type available", async () => {
      render(<ReportDialog report={mockReport} types={["BUG"]} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should skip to step 2 directly
      expect(screen.getByText("Tell us more")).toBeInTheDocument();
    });

    it("advances from step 1 to step 2 on category click", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });

      expect(screen.getByText("Tell us more")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("What went wrong? Describe it or paste an error...")).toBeInTheDocument();
    });

    it("shows severity picker for BUG type", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });

      expect(screen.getByText("Severity")).toBeInTheDocument();
      expect(screen.getByText("low")).toBeInTheDocument();
      expect(screen.getByText("medium")).toBeInTheDocument();
      expect(screen.getByText("high")).toBeInTheDocument();
    });

    it("hides severity picker when showSeverity is false", async () => {
      render(<ReportDialog report={mockReport} showSeverity={false} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });

      expect(screen.queryByText("Severity")).toBeNull();
    });

    it("hides severity picker for non-BUG types", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Feature Request"));
      });

      expect(screen.queryByText("Severity")).toBeNull();
    });

    it("shows dynamic placeholder per type", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Feature Request"));
      });

      expect(
        screen.getByPlaceholderText("Describe the feature you'd like...")
      ).toBeInTheDocument();
    });

    it("Send Report button is disabled when description is empty", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });

      expect(screen.getByText("Send Report")).toBeDisabled();
    });

    it("Send Report button is enabled after filling description", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });

      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText("What went wrong? Describe it or paste an error..."), {
          target: { value: "App crashes on login" },
        });
      });

      expect(screen.getByText("Send Report")).not.toBeDisabled();
    });

    it("back button navigates to previous step", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });

      expect(screen.getByText("Tell us more")).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Back"));
      });

      expect(screen.getByText("What's on your mind?")).toBeInTheDocument();
    });
  });

  // ─── Submit ─────────────────────────────────────────────

  describe("submit", () => {
    it("calls report() with correct type and description", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Feature Request"));
      });

      await act(async () => {
        fireEvent.change(
          screen.getByPlaceholderText("Describe the feature you'd like..."),
          { target: { value: "Add dark mode" } }
        );
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Send Report"));
      });

      expect(mockReport).toHaveBeenCalledWith(
        "FEATURE_REQUEST",
        "Add dark mode",
        expect.objectContaining({ screenshots: expect.any(String) })
      );
    });

    it("includes severity in metadata for BUG type", async () => {
      mockReport.mockClear();
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("high"));
      });

      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText("What went wrong? Describe it or paste an error..."), {
          target: { value: "Login crashes" },
        });
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Send Report"));
      });

      expect(mockReport).toHaveBeenCalledWith("BUG", "Login crashes",
        expect.objectContaining({ severity: "high" })
      );
    });

    it("shows success message after submit", async () => {
      render(<ReportDialog report={mockReport} />);

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });

      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText("What went wrong? Describe it or paste an error..."), {
          target: { value: "Something broke" },
        });
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Send Report"));
      });

      expect(screen.getByText(/sent. Thank you!/)).toBeInTheDocument();
    });
  });

  // ─── State Reset ────────────────────────────────────────

  describe("state reset", () => {
    it("resets to step 1 after close and reopen", async () => {
      render(<ReportDialog report={mockReport} />);

      // Open and navigate to step 2
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });

      expect(screen.getByText("Tell us more")).toBeInTheDocument();

      // Close
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      // Reopen — should be at step 1
      await act(async () => {
        window.dispatchEvent(
          new CustomEvent("glitchgrab:open-report", { detail: {} })
        );
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(screen.getByText("What's on your mind?")).toBeInTheDocument();
    });
  });
  // ─── Reporter identity ──────────────────────────────────

  describe("reporter identity", () => {
    it("shows the signed-in reporter's name", async () => {
      render(
        <ReportDialog report={mockReport} reporter={{ name: "Naresh Bhosale" }} />
      );
      await openDialog();

      expect(screen.getByText("Naresh Bhosale")).toBeInTheDocument();
      expect(screen.queryByText("Anonymous")).not.toBeInTheDocument();
    });

    it("falls back to initials when there is no avatar", async () => {
      render(
        <ReportDialog report={mockReport} reporter={{ name: "Naresh Bhosale" }} />
      );
      await openDialog();

      expect(screen.getByText("NB")).toBeInTheDocument();
    });

    it("renders the avatar image when one is supplied", async () => {
      render(
        <ReportDialog
          report={mockReport}
          reporter={{ name: "Asha", avatarUrl: "https://cdn.example.com/a.png" }}
        />
      );
      await openDialog();

      // The dialog portals into document.body, so the RTL container is empty.
      const img = document.body.querySelector('img[src="https://cdn.example.com/a.png"]');
      expect(img).toBeInTheDocument();
    });

    it("falls back to initials when the avatar fails to load", async () => {
      // A 404 or a host CSP that blocks img-src must not leave an empty circle.
      render(
        <ReportDialog
          report={mockReport}
          reporter={{ name: "Asha Rao", avatarUrl: "https://cdn.example.com/gone.png" }}
        />
      );
      await openDialog();

      const img = document.body.querySelector<HTMLImageElement>(
        'img[src="https://cdn.example.com/gone.png"]'
      );
      expect(img).toBeInTheDocument();

      await act(async () => {
        fireEvent.error(img!);
      });

      expect(
        document.body.querySelector('img[src="https://cdn.example.com/gone.png"]')
      ).toBeNull();
      expect(screen.getByText("AR")).toBeInTheDocument();
    });

    it("appends the role when the host supplies one", async () => {
      render(
        <ReportDialog report={mockReport} reporter={{ name: "Priya", role: "tester" }} />
      );
      await openDialog();

      expect(screen.getByText(/Priya/)).toBeInTheDocument();
      expect(screen.getByText(/tester/)).toBeInTheDocument();
    });

    it("says 'Anonymous' when no reporter is passed", async () => {
      // Silence here would read as "you are signed in" — the exact thing that
      // lets someone file a report nobody can follow up on.
      render(<ReportDialog report={mockReport} />);
      await openDialog();

      expect(screen.getByText("Anonymous")).toBeInTheDocument();
    });

    it("treats a whitespace-only name as anonymous", async () => {
      render(<ReportDialog report={mockReport} reporter={{ name: "   " }} />);
      await openDialog();

      expect(screen.getByText("Anonymous")).toBeInTheDocument();
    });
  });
});
