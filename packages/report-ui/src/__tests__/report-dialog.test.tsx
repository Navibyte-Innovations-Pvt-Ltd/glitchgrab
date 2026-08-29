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

  // ─── Overlay layers ─────────────────────────────────────
  //
  // The preview and annotation overlays are full-viewport portals pinned to the
  // top of the stacking order. One left mounted after the dialog closes swallows
  // every click, keystroke and drag on the page underneath — including the next
  // time the dialog opens, which then appears but accepts no input.

  describe("overlay layers", () => {
    /** Opens the dialog, advances to step 2, and starts annotating the screenshot. */
    async function openAnnotator() {
      render(<ReportDialog report={mockReport} />);
      await openDialog();
      await act(async () => {
        fireEvent.click(screen.getByText("Bug Report"));
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Annotate screenshot 1"));
      });
    }

    it("Escape closes the annotation overlay before the dialog", async () => {
      await openAnnotator();
      expect(document.querySelectorAll("[data-glitchgrab-layer]").length).toBe(2);

      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      // Topmost layer gone, dialog still standing.
      expect(document.querySelectorAll("[data-glitchgrab-layer]").length).toBe(1);
      expect(screen.getByText("Tell us more")).toBeInTheDocument();
    });

    it("leaves no overlay behind once the dialog is closed", async () => {
      await openAnnotator();

      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(document.querySelector("[data-glitchgrab-layer]")).toBeNull();
      // The canvas is the annotator's own element — checked separately so this
      // still fails loudly if the layer marker is ever dropped.
      expect(document.querySelector("canvas")).toBeNull();
    });

    it("reopens without a stale overlay on top", async () => {
      await openAnnotator();

      // Close straight from the annotator, the way a click on the host page or a
      // submit would — the annotation index must not survive into the next open.
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      await openDialog();

      expect(document.querySelectorAll("[data-glitchgrab-layer]").length).toBe(1);
      expect(screen.getByText("What's on your mind?")).toBeInTheDocument();
    });
  });

  // ─── Host focus traps ───────────────────────────────────
  //
  // A Radix (or any other) focus trap on the host page keeps document-level
  // focusin/focusout listeners that pull focus back into its own container,
  // which makes our textarea impossible to type into.

  describe("host focus traps", () => {
    function addHostLayer(role: string) {
      const el = document.createElement("div");
      el.setAttribute("role", role);
      document.body.appendChild(el);
      return el;
    }

    it("makes host dialogs, menus and listboxes inert while open", async () => {
      const layers = ["dialog", "alertdialog", "menu", "listbox"].map(addHostLayer);

      render(<ReportDialog report={mockReport} />);
      await openDialog();

      layers.forEach((el) => expect(el.hasAttribute("inert")).toBe(true));

      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      layers.forEach((el) => {
        expect(el.hasAttribute("inert")).toBe(false);
        el.remove();
      });
    });

    it("catches a host layer that opens after the dialog is already up", async () => {
      render(<ReportDialog report={mockReport} />);
      await openDialog();

      // The one-shot snapshot this replaced missed exactly this: a host modal
      // mounting on top of an open dialog, e.g. a prompt fired by a late query.
      const late = addHostLayer("dialog");
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(late.hasAttribute("inert")).toBe(true);

      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      expect(late.hasAttribute("inert")).toBe(false);
      late.remove();
    });

    it("leaves a host layer that was already inert alone", async () => {
      const preInert = addHostLayer("dialog");
      preInert.setAttribute("inert", "");

      render(<ReportDialog report={mockReport} />);
      await openDialog();
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(preInert.hasAttribute("inert")).toBe(true);
      preInert.remove();
    });

    it("never marks its own layers inert", async () => {
      addHostLayer("dialog");
      render(<ReportDialog report={mockReport} />);
      await openDialog();

      document.querySelectorAll("[data-glitchgrab-layer]").forEach((el) => {
        expect(el.hasAttribute("inert")).toBe(false);
      });

      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      document.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
    });
  });

  // ─── Voice never mangles typed text ─────────────────────

  describe("voice input vs typing", () => {
    const transcribeAudio = vi.fn().mockResolvedValue("");

    /** Hold-to-talk and the mic only exist when the host can transcribe. */
    const renderWithVoice = () =>
      render(<ReportDialog report={mockReport} transcribeAudio={transcribeAudio} />);

    const bugTextarea = () =>
      screen.getByPlaceholderText(
        /What went wrong|Hold space/i
      ) as HTMLTextAreaElement;

    const typeInto = (ta: HTMLTextAreaElement, value: string) => {
      fireEvent.change(ta, { target: { value } });
      ta.selectionStart = ta.selectionEnd = value.length;
    };

    it("leaves the caret alone when typing continues through a space hold", async () => {
      renderWithVoice();
      await openDialog({ type: "BUG" });
      const ta = bugTextarea();

      typeInto(ta, "the ");
      // Space keydown arms push-to-talk. No keyup — the user just keeps typing,
      // which is what a slow phone keyboard looks like from here.
      fireEvent.keyDown(ta, { code: "Space", key: " " });
      typeInto(ta, "the students");

      await act(async () => {
        await new Promise((r) => setTimeout(r, 500));
      });

      expect(ta.value).toBe("the students");
      // The old code yanked the caret back to where the space was typed, so
      // every following keystroke landed inside "students".
      expect(ta.selectionStart).toBe(12);
    });

    it("still strips the space on a real hold from an empty field", async () => {
      renderWithVoice();
      await openDialog({ type: "BUG" });
      const ta = bugTextarea();

      // The hint that advertises this ("Hold Space to speak") is a placeholder,
      // so this is the only state where a user is told the gesture exists.
      fireEvent.keyDown(ta, { code: "Space", key: " " });
      typeInto(ta, " ");

      await act(async () => {
        await new Promise((r) => setTimeout(r, 500));
      });

      expect(ta.value).toBe("");
    });

    it("never arms mid-sentence, however long the space is held", async () => {
      renderWithVoice();
      await openDialog({ type: "BUG" });
      const ta = bugTextarea();

      typeInto(ta, "the students");
      fireEvent.keyDown(ta, { code: "Space", key: " " });
      typeInto(ta, "the students ");

      await act(async () => {
        // Well past the hold threshold — a pause to think, not a gesture.
        await new Promise((r) => setTimeout(r, 800));
      });

      // The space survives and the mic stays shut.
      expect(ta.value).toBe("the students ");
      expect(screen.getByTitle("Speak your report")).toBeInTheDocument();
    });

    it("types a whole sentence, one key at a time, unchanged", async () => {
      renderWithVoice();
      await openDialog({ type: "BUG" });
      const ta = bugTextarea();

      const sentence = "the students full name is not visible";
      let wordsDone = 0;
      for (const ch of sentence) {
        const code = ch === " " ? "Space" : `Key${ch.toUpperCase()}`;
        await act(async () => {
          fireEvent.keyDown(ta, { key: ch, code });
          const caret = ta.selectionStart ?? ta.value.length;
          fireEvent.change(ta, {
            target: { value: ta.value.slice(0, caret) + ch + ta.value.slice(caret) },
          });
          ta.selectionStart = ta.selectionEnd = caret + 1;
          await new Promise((r) => setTimeout(r, 15));
        });
        // Pause on the space after "the" and after "name", finger still down —
        // this is what stopping to think looks like from the keyboard's side.
        const thinking = ch === " " && [0, 3].includes(wordsDone++);
        await act(async () => {
          await new Promise((r) => setTimeout(r, thinking ? 600 : 10));
          fireEvent.keyUp(ta, { key: ch, code });
        });
      }

      // Before the gate this came out "thestudents full nameis not visible" —
      // each pause ate its space and opened the mic behind the user's back.
      expect(ta.value).toBe(sentence);
    }, 30000);

    it("keeps words typed while the mic is open", async () => {
      // Web Speech present, mic stream unavailable — the live-preview path only.
      const instances: any[] = [];
      class FakeRecognition {
        lang = "";
        interimResults = false;
        continuous = false;
        onstart: (() => void) | null = null;
        onresult: ((e: any) => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((e: any) => void) | null = null;
        start() {
          instances.push(this);
          this.onstart?.();
        }
        stop() {}
      }
      (window as any).webkitSpeechRecognition = FakeRecognition;
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia: vi.fn().mockRejectedValue(new Error("no mic")) },
      });

      try {
        renderWithVoice();
        await openDialog({ type: "BUG" });
        const ta = bugTextarea();

        await act(async () => {
          fireEvent.click(screen.getByTitle("Speak your report"));
          await new Promise((r) => setTimeout(r, 0));
        });
        const rec = instances[0];
        expect(rec).toBeTruthy();

        const speak = (transcript: string) =>
          act(() => {
            rec.onresult({
              resultIndex: 0,
              results: [{ 0: { transcript }, isFinal: true, length: 1 }],
            });
          });

        await speak("the page is blank");
        // User types while the mic is still listening.
        typeInto(ta, "the page is blank and slow");
        await speak("on mobile");

        // The old code rebuilt the field from the snapshot taken when
        // listening started, so "and slow" disappeared on the next word heard.
        expect(ta.value).toContain("and slow");
        expect(ta.value).toContain("on mobile");
      } finally {
        delete (window as any).webkitSpeechRecognition;
      }
    });

    it("keeps typed words when the transcript comes back (no Web Speech)", async () => {
      // Firefox shape: a mic stream and a transcriber, no live preview. The
      // result used to overwrite the field from the snapshot taken when
      // recording started, deleting anything typed since.
      const recorders: any[] = [];
      class FakeMediaRecorder {
        mimeType = "audio/webm";
        ondataavailable: ((e: any) => void) | null = null;
        onstop: (() => void) | null = null;
        start() {
          recorders.push(this);
        }
        stop() {
          this.ondataavailable?.({ data: new Blob(["x"]) });
          this.onstop?.();
        }
      }
      (window as any).MediaRecorder = FakeMediaRecorder;
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
        },
      });
      transcribeAudio.mockResolvedValueOnce("on mobile");

      try {
        renderWithVoice();
        await openDialog({ type: "BUG" });
        const ta = bugTextarea();
        typeInto(ta, "the page is blank");

        await act(async () => {
          fireEvent.click(screen.getByTitle("Speak your report"));
          await new Promise((r) => setTimeout(r, 0));
        });
        expect(recorders[0]).toBeTruthy();

        // User keeps typing while the mic runs, then stops it.
        typeInto(ta, "the page is blank and slow");
        await act(async () => {
          recorders[0].stop();
          await new Promise((r) => setTimeout(r, 10));
        });

        expect(ta.value).toContain("and slow");
        expect(ta.value).toContain("on mobile");
      } finally {
        delete (window as any).MediaRecorder;
      }
    });
  });
});
