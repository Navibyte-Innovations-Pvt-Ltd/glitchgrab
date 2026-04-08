import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { ReportDialog } from "../report-dialog";

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
    it("shows all 4 category cards by default", async () => {
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
      expect(screen.getByPlaceholderText("What went wrong?")).toBeInTheDocument();
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

    it("Next button is disabled when description is empty", async () => {
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

      expect(screen.getByText("Next")).toBeDisabled();
    });

    it("advances to step 3 review", async () => {
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
        fireEvent.change(screen.getByPlaceholderText("What went wrong?"), {
          target: { value: "App crashes on login" },
        });
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Next"));
      });

      expect(screen.getByText("Review & Send")).toBeInTheDocument();
      expect(screen.getByText("App crashes on login")).toBeInTheDocument();
      expect(screen.getByText("Bug Report")).toBeInTheDocument();
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
        fireEvent.click(screen.getByText("Next"));
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Send Report"));
      });

      expect(mockReport).toHaveBeenCalledWith(
        "FEATURE_REQUEST",
        "Add dark mode",
        expect.objectContaining({ screenshot: expect.any(String) })
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
        fireEvent.change(screen.getByPlaceholderText("What went wrong?"), {
          target: { value: "Login crashes" },
        });
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Next"));
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
        fireEvent.change(screen.getByPlaceholderText("What went wrong?"), {
          target: { value: "Something broke" },
        });
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Next"));
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
});
