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

  // ⌘⇧G lands on the assistant, not on the form behind it. The form is still
  // one tap away — "Write it myself" — which is what keeps this an extra mode.
  it("opens straight into the sheet when the host wires an assistant", async () => {
    const assist: AssistFn = vi.fn();
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG" });
    expect(
      screen.getByRole("dialog", { name: /Describe your report with AI/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Write it myself")).toBeInTheDocument();
  });

  // Opened cold — no type — the sheet asks before anything else, as chips.
  // No model turn is spent on a question a tap can answer.
  it("asks what the report is before spending a model turn", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: "Which page?",
      report: null,
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog();

    expect(sheet().getByText(/What do you want to do\?/i)).toBeInTheDocument();
    expect(assist).not.toHaveBeenCalled();
    // No composer yet — a chip is the answer, so a text box would only invite
    // someone to type a type name we would then have to parse.
    expect(screen.queryByPlaceholderText("Type your answer…")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(sheet().getByText("Feature Request"));
      await new Promise((r) => setTimeout(r, 20));
    });
    // Picked, and now it is a conversation.
    expect(screen.getByPlaceholderText("Type your answer…")).toBeInTheDocument();
    expect(sheet().getByText("Feature Request")).toBeInTheDocument();
  });

  // The picked tile has to reach the dialog's own state, or the report files
  // as the default BUG no matter what the reporter chose.
  it("files under the tile picked in the sheet", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: null,
      report: "The export button should also do CSV.",
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog();

    await act(async () => {
      fireEvent.click(sheet().getByText("Feature Request"));
      await new Promise((r) => setTimeout(r, 20));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("It did the wrong thing"));
      await new Promise((r) => setTimeout(r, 30));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send Report" }));
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(mockReport.mock.calls[0][0]).toBe("FEATURE_REQUEST");
  });

  // A star needs no assistant. "Rate us" is a chip like any other, but it goes
  // to the host's FeedbackFn and never near a model.
  it("rates without a model turn, through the host's feedback fn", async () => {
    const assist: AssistFn = vi.fn();
    const sendFeedback = vi.fn().mockResolvedValue({ success: true });
    render(
      <ReportDialog report={mockReport} assist={assist} sendFeedback={sendFeedback} />
    );
    await openDialog();

    await act(async () => {
      fireEvent.click(sheet().getByText("★ Rate us"));
    });
    // Nothing to send yet — the stars are the payload.
    expect(screen.getByRole("button", { name: /Pick a star first/i })).toBeDisabled();

    await act(async () => {
      fireEvent.click(sheet().getByLabelText("5 stars"));
    });
    fireEvent.change(sheet().getByPlaceholderText(/optional/i), {
      target: { value: "works great" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send Rating" }));
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(sendFeedback).toHaveBeenCalledWith(5, "works great");
    expect(assist).not.toHaveBeenCalled();
    expect(mockReport).not.toHaveBeenCalled();
  });

  // A host with no feedback wiring must not be offered a chip that fails.
  it("hides the rating chip when the host wired no feedback fn", async () => {
    const assist: AssistFn = vi.fn();
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog();
    expect(sheet().queryByText("★ Rate us")).not.toBeInTheDocument();
  });

  it("sends what the reporter already typed as the first message instead of making them retype it", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: "What did you expect instead?",
      report: null,
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "save button broken" });

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

    // Still mounted — the screenshots and attachments live there — but gone
    // from the screen for as long as the sheet is the surface in charge.
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

    await screen.findByText("Which page?");

    await act(async () => {
      fireEvent.click(screen.getByText("Write it myself"));
    });
    expect(screen.queryByText("Which page?")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("broken")).toBeInTheDocument();
    // Backing out is not "used up": the in-form button is where they left it.
    expect(screen.getByRole("button", { name: /Describe it with AI/i })).toBeInTheDocument();
  });

  it("passes the attached screenshot to the assistant so it can read it", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: "What went wrong?",
      report: null,
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "look at this" });

    await waitFor(() => expect(assist).toHaveBeenCalled());
    expect(assist.mock.calls[0][0].screenshot).toContain("data:image");
  });

  // Vague input used to produce another question ("what specifically?"), which
  // is the one thing a person who cannot phrase it does not need.
  it("renders the assistant's options as chips and sends the tapped one", async () => {
    const assist = vi
      .fn()
      .mockResolvedValueOnce({
        conversationId: "c1",
        question: "I can see a list of repo cards.",
        options: ["The cards feel cramped", "The toggle is hard to find", "Something else"],
        report: null,
      })
      .mockResolvedValueOnce({
        conversationId: "c1",
        question: null,
        options: [],
        report: "The repo cards feel cramped.",
      });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "UI_IMPROVEMENT", description: "i think it can be better" });

    const chip = await screen.findByText("The cards feel cramped");
    await act(async () => {
      fireEvent.click(chip);
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(assist.mock.calls[1][0].messages.at(-1)).toEqual({
      role: "user",
      content: "The cards feel cramped",
    });
    // The row is gone once answered — a stale chip answers a question that has
    // already moved on.
    expect(screen.queryByText("The toggle is hard to find")).not.toBeInTheDocument();
  });

  // The whole point of the duplicate check: the reporter is told the team knows,
  // and their words land on that issue instead of becoming a fifth copy of it.
  it("says which issue this already is, and files onto it", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: null,
      report: "Save does nothing on the settings page.",
      duplicate: { number: 123, title: "Save button does nothing", url: "https://x/123" },
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "save is broken" });

    await screen.findByText(/already on this/i);
    expect(sheet().getByText(/#123 Save button does nothing/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add to #123" }));
      await new Promise((r) => setTimeout(r, 30));
    });
    // Same submit path as every other report — the issue number rides in
    // metadata, and the server decides whether to honour it.
    expect(mockReport.mock.calls[0][2]).toMatchObject({ duplicateIssueNumber: "123" });
  });

  it("files normally when the assistant matched nothing", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: null,
      report: "Save does nothing.",
      duplicate: null,
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "save is broken" });

    await act(async () => {
      fireEvent.click(await screen.findByRole("button", { name: "Send Report" }));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(mockReport.mock.calls[0][2]?.duplicateIssueNumber).toBeUndefined();
  });

  // The assistant is an extra mode, and someone it is failing must always be
  // one tap from the form — including on a phone, where this used to be a bare
  // × that reads as "give up" rather than "switch".
  it("offers the plain form from the sheet at every point in the conversation", async () => {
    const assist = vi.fn().mockResolvedValue({
      conversationId: "c1",
      question: "Which page?",
      report: null,
    });
    render(<ReportDialog report={mockReport} assist={assist} />);
    await openDialog({ type: "BUG", description: "broken" });

    // Header, from the first frame.
    expect(sheet().getByRole("button", { name: /write it myself/i })).toBeInTheDocument();

    await screen.findByText("Which page?");
    // And again under the composer, where people actually give up.
    const escapes = sheet().getAllByText(/write it myself|fill the form yourself/i);
    expect(escapes.length).toBeGreaterThan(1);

    await act(async () => {
      fireEvent.click(sheet().getByText(/fill the form yourself/i));
    });
    // Back on the dialog, with what they typed intact and nothing filed.
    expect(screen.getByText("Tell us more")).toBeVisible();
    expect(screen.getByDisplayValue("broken")).toBeInTheDocument();
    expect(mockReport).not.toHaveBeenCalled();
  });

  // A host that opens straight on RATING gets the stars, not a chat about them.
  it("skips the conversation entirely when opened on RATING", async () => {
    const assist: AssistFn = vi.fn();
    render(
      <ReportDialog
        report={mockReport}
        assist={assist}
        sendFeedback={vi.fn().mockResolvedValue({ success: true })}
      />
    );
    await openDialog({ type: "RATING" });
    expect(sheet().getByLabelText("5 stars")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Type your answer…")).not.toBeInTheDocument();
    expect(assist).not.toHaveBeenCalled();
  });
});
