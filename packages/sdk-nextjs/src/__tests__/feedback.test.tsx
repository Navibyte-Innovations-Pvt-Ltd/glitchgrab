import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import { GlitchgrabProvider } from "../provider";
import { FeedbackButton } from "../feedback-button";
import { sendFeedback } from "../utils";

describe("sendFeedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("posts to the feedback endpoint with the token as a Bearer header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { feedbackId: "f1", rating: 5 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendFeedback(
      { token: "gg_test", rating: 5, message: "Great" },
      "https://example.test"
    );

    expect(result).toEqual({ success: true, feedbackId: "f1", rating: 5 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.test/api/v1/sdk/feedback");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer gg_test");
    expect(JSON.parse(init.body)).toMatchObject({ rating: 5, message: "Great" });
  });

  it("does not retry a 400 — a bad rating is the caller's mistake, not a blip", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendFeedback({ token: "gg_test", rating: 9 });

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null instead of throwing when the network is down", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const promise = sendFeedback({ token: "gg_test", rating: 4 });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBeNull();
  });
});

describe("FeedbackButton", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the shared report dialog straight onto its rating step", async () => {
    render(
      <GlitchgrabProvider token="gg_test">
        <FeedbackButton />
      </GlitchgrabProvider>
    );

    expect(screen.queryByRole("button", { name: "Send Rating" })).toBeNull();

    await act(async () => {
      screen.getByRole("button", { name: "Feedback" }).click();
    });

    // Opening awaits a screenshot capture, so the dialog lands a tick later.
    // Same dialog as a bug report, skipped to the RATING tile's step 2 — the
    // stars are there, and there is no second modal.
    const fifthStar = await screen.findByRole("button", { name: "5 stars" });
    expect(fifthStar).toBeTruthy();

    // Stays disabled until a star is picked: the rating, not the text, is the payload.
    const send = screen.getByRole("button", { name: "Send Rating" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    await act(async () => {
      fifthStar.click();
    });
    expect((screen.getByRole("button", { name: "Send Rating" }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });

  it("renders nothing outside a provider instead of throwing", () => {
    const { container } = render(<FeedbackButton />);
    expect(container.firstChild).toBeNull();
  });
});
