import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor, within } from "@testing-library/react";
import { ReportDialog } from "../report-dialog";
import type { AssistFn } from "../types";

// Mock html2canvas so it doesn't create iframes in jsdom
vi.mock("html2canvas-pro", () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => "data:image/jpeg;base64,fake",
  }),
}));

const mockReport = vi.fn().mockResolvedValue({ success: true, reportId: "r1" });

/**
 * The sheet and the dialog share `description` state, so the same text renders
 * in two textareas. Scope every draft assertion to the sheet — asserting
 * globally would pass even if the sheet rendered nothing.
 */
function sheet() {
  return within(screen.getByRole("dialog", { name: /Describe your report with AI/i }));
}

async function openDialog(detail: Record<string, unknown> = {}) {
  await act(async () => {
    window.dispatchEvent(new CustomEvent("glitchgrab:open-report", { detail }));
    await new Promise((r) => setTimeout(r, 50));
  });
}

beforeEach(() => {
  mockReport.mockClear();
});

/**
 * The AI report assistant sheet (#330).
 *
 * The behaviour these tests defend is the one the feature stands or falls on:
 * the assistant is an EXTRA mode, the plain form is never taken away, and the
 * sheet never grows a second submit path. Every failure path has to end with a
 * reporter who can still file their bug.
 */
describe("AI assist sheet", () => {
  it("does not appear at all when the host passes no assist fn", async () => {
    render(<ReportDialog report={mockReport} />);
    await openDialog({ type: "BUG" });
    expect(screen.queryByText("Describe it with AI")).not.toBeInTheDocument();
  });

  it("offers the assistant when the host wires one", async () => {
    const assist: AssistFn = vi.fn();
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG" });
    expect(screen.getByText("Describe it with AI")).toBeInTheDocument();
    // The plain textarea is still right there — this is a second option, not a
    // replacement for the form.
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("sends what the reporter already typed as the first message instead of making them retype it", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: "What did you expect instead?",
      report: null,
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "save button broken" });

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 20));
    });

    await waitFor(() => expect(assist).toHaveBeenCalled());
    const call = assist.mock.calls[0][0];
    expect(call.messages).toEqual([{ role: "user", content: "save button broken" }]);
    expect(call.conversationId).toBeNull();
    await screen.findByText("What did you expect instead?");
  });

  it("shows the finished report as an editable draft inside the sheet, with Send", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: null,
      report: "Pressing Save on the settings page does nothing.",
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "save broken" });

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 30));
    });

    await screen.findByText(/edit anything/i);
    expect(
      sheet().getByDisplayValue("Pressing Save on the settings page does nothing.")
    ).toBeInTheDocument();
    // The reporter finishes here — no bounce back to the dialog. And only one
    // Send exists in the a11y tree: the dialog underneath is inert.
    expect(screen.getByRole("button", { name: "Send Report" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Type your answer…")).not.toBeInTheDocument();
  });

  // The whole point of moving submission into the sheet was to reuse the
  // dialog's handler, not to grow a second one.
  it("submits through the dialog's own report fn, not a path of its own", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: null,
      report: "Pressing Save does nothing.",
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "save broken" });

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 30));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send Report" }));
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport.mock.calls[0][0]).toBe("BUG");
    expect(mockReport.mock.calls[0][1]).toBe("Pressing Save does nothing.");
  });

  // The two share `description` and `severity`. Leaving the dialog on screen
  // behind the sheet showed the same report text, the same severity buttons and
  // a second Send Report through a translucent overlay — one report wearing two
  // faces. It is hidden, not unmounted, so nothing is lost on the way back.
  it("hides the dialog while the sheet is in charge, and restores it intact", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: null,
      report: "Pressing Save does nothing.",
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "save broken" });
    expect(screen.getByText("Tell us more")).toBeVisible();

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 30));
    });
    // Still mounted — the screenshots and attachments live there — but gone.
    expect(screen.getByText("Tell us more")).not.toBeVisible();

    await act(async () => {
      fireEvent.click(screen.getByText("Write it myself"));
    });
    expect(screen.getByText("Tell us more")).toBeVisible();
    // The draft the assistant wrote came back with it.
    expect(screen.getByDisplayValue("Pressing Save does nothing.")).toBeInTheDocument();
  });

  it("can go back to chatting when the draft is not right", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: null,
      report: "Pressing Save does nothing.",
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "save broken" });

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 30));
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/keep chatting/i));
    });
    expect(screen.getByPlaceholderText("Type your answer…")).toBeInTheDocument();
  });

  it("offers starters when there is nothing typed yet", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: "Which page?",
      report: null,
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG" });

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 20));
    });
    // Nothing was typed, so nothing was sent — it waits for them.
    expect(assist).not.toHaveBeenCalled();
    const starter = screen.getByText("Something on this page is broken");

    await act(async () => {
      fireEvent.click(starter);
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(assist.mock.calls[0][0].messages).toEqual([
      { role: "user", content: "Something on this page is broken" },
    ]);
  });

  it("keeps the form usable and says why when the assistant is over the cap", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: null,
      question: null,
      report: null,
      degraded: "The AI assistant has hit this project's monthly limit.",
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "it broke" });

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(
      screen.getByText("The AI assistant has hit this project's monthly limit.")
    ).toBeInTheDocument();
    // What the reporter typed is untouched, and the form still works.
    expect(screen.getByDisplayValue("it broke")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Type your answer…")).not.toBeInTheDocument();
    // A degrade retires the assistant for this report — no button to re-open.
    expect(screen.queryByText("Describe it with AI")).not.toBeInTheDocument();
  });

  // A host is a host — the contract says never throw, but if one does, the
  // reporter must not be left staring at a dead panel.
  it("degrades rather than breaking when the host fn throws", async () => {
    const assist = vi.fn().mockRejectedValue(new Error("network"));
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "broken" });

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(screen.getByText(/assistant is unavailable/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("broken")).toBeInTheDocument();
  });

  // Backing out by hand is not "used up" — the button stays where they left it.
  it("lets the reporter walk away from the sheet back to the plain form", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: "Which page?",
      report: null,
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "broken" });

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 30));
    });
    await screen.findByText("Which page?");

    await act(async () => {
      fireEvent.click(screen.getByText("Write it myself"));
    });
    expect(screen.queryByText("Which page?")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("broken")).toBeInTheDocument();
    expect(screen.getByText("Describe it with AI")).toBeInTheDocument();
  });

  it("passes the attached screenshot to the assistant so it can read it", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: "What went wrong?",
      report: null,
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "look at this" });

    await act(async () => {
      fireEvent.click(screen.getByText("Describe it with AI"));
      await new Promise((r) => setTimeout(r, 30));
    });

    await waitFor(() => expect(assist).toHaveBeenCalled());
    expect(assist.mock.calls[0][0].screenshot).toContain("data:image");
  });

  // A star rating is not something anyone needs help writing.
  it("is hidden on the rating tile", async () => {
    const assist: AssistFn = vi.fn();
    render(
      <ReportDialog
        report={mockReport}
        assist={assist}
        sendFeedback={vi.fn().mockResolvedValue({ success: true })}
      />
    );
    await openDialog({ type: "RATING" });
    expect(screen.queryByText("Describe it with AI")).not.toBeInTheDocument();
  });
});
