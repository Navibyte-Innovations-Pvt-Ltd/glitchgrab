import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { GlitchgrabProvider } from "../provider";
import { clearDedupCache } from "../dedup";
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
    // `seen` is module-level — without this, cases poison each other via dedup.
    clearDedupCache();
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

  const dispatchRejection = async (reason: unknown) => {
    const promise = Promise.reject(reason);
    promise.catch(() => {}); // Prevent unhandled rejection warning/error in test runner

    await act(async () => {
      window.dispatchEvent(
        new PromiseRejectionEvent("unhandledrejection", { promise, reason })
      );
    });
  };

  it("reports plain-object rejections with their real fields, not [object Object]", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    await dispatchRejection({ code: "TIMEOUT", endpoint: "/token" });

    expect(utils.sendReport).toHaveBeenCalled();
    const payload = vi.mocked(utils.sendReport).mock.calls[0][0];
    expect(payload.errorMessage).toBe("TIMEOUT");
    expect(payload.errorMessage).not.toBe("[object Object]");
    expect(payload.metadata?.rejectionReason).toContain("/token");
  });

  it("drops rejections with no message and no stack", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    await dispatchRejection({});
    await dispatchRejection(undefined);
    await dispatchRejection(null);

    expect(utils.sendReport).not.toHaveBeenCalled();
  });

  it("filters extension rejections whose stack survives a failed instanceof Error", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    await dispatchRejection({
      name: "Error",
      message: "extensionService request failed",
      stack: "Error: request failed\n  at chrome-extension://abcdef/inject.js:1:1",
    });

    expect(utils.sendReport).not.toHaveBeenCalled();
  });

  it("dedups repeat rejections whose payload fields are volatile", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    // No stable rung — the message must describe the shape, not the values, or
    // every occurrence gets a unique signature and an error spike files N issues.
    await dispatchRejection({ endpoint: "/token", reqId: "a7f3" });
    await dispatchRejection({ endpoint: "/token", reqId: "b91c" });

    expect(utils.sendReport).toHaveBeenCalledTimes(1);
  });

  it("does not throw on a circular rejection reason", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>Child component</div>
      </GlitchgrabProvider>
    );

    const circular: Record<string, unknown> = { code: "LOOP" };
    circular.self = circular;

    await dispatchRejection(circular);

    expect(utils.sendReport).toHaveBeenCalled();
    expect(vi.mocked(utils.sendReport).mock.calls[0][0].errorMessage).toBe("LOOP");
  });
});
