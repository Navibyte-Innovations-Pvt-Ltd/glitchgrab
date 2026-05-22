import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { GlitchgrabProvider } from "../provider";
import * as utils from "../utils";

vi.mock("../utils", async () => {
  const actual = await vi.importActual<typeof import("../utils")>("../utils");
  return {
    ...actual,
    sendReport: vi.fn().mockResolvedValue({ success: true, reportId: "r2" }),
  };
});

describe("GlitchgrabProvider error filtering", () => {
  beforeEach(() => {
    vi.mocked(utils.sendReport).mockClear();
  });

  it("filters out 'Script error.' from error event", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    // Trigger ErrorEvent with "Script error." message
    await act(async () => {
      const errorEvent = new ErrorEvent("error", {
        message: "Script error.",
        error: new Error("Script error."),
      });
      window.dispatchEvent(errorEvent);
    });

    expect(utils.sendReport).not.toHaveBeenCalled();
  });

  it("filters out 'Script error' from error event", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    // Trigger ErrorEvent with "Script error" message
    await act(async () => {
      const errorEvent = new ErrorEvent("error", {
        message: "Script error",
        error: new Error("Script error"),
      });
      window.dispatchEvent(errorEvent);
    });

    expect(utils.sendReport).not.toHaveBeenCalled();
  });

  it("allows standard error events through", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    // Trigger ErrorEvent with standard error message
    await act(async () => {
      const errorEvent = new ErrorEvent("error", {
        message: "Cannot read property 'foo' of undefined",
        error: new TypeError("Cannot read property 'foo' of undefined"),
      });
      window.dispatchEvent(errorEvent);
    });

    expect(utils.sendReport).toHaveBeenCalled();
  });

  it("filters out 'Script error.' from promise rejection", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    const promise = Promise.reject(new Error("Script error."));
    promise.catch(() => {}); // Prevent unhandled rejection warning/error in test runner

    // Trigger PromiseRejectionEvent with "Script error." message
    await act(async () => {
      const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
        promise,
        reason: new Error("Script error."),
      });
      window.dispatchEvent(rejectionEvent);
    });

    expect(utils.sendReport).not.toHaveBeenCalled();
  });

  it("allows standard promise rejections through", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    const promise = Promise.reject(new Error("API failure"));
    promise.catch(() => {}); // Prevent unhandled rejection warning/error in test runner

    // Trigger PromiseRejectionEvent with standard reason
    await act(async () => {
      const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
        promise,
        reason: new Error("API failure"),
      });
      window.dispatchEvent(rejectionEvent);
    });

    expect(utils.sendReport).toHaveBeenCalled();
  });
});
