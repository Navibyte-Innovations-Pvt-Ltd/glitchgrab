import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { GlitchgrabProvider, useGlitchgrab } from "../provider";
import { captureError, clearCaptureConfig } from "../capture";
import { clearDedupCache } from "../dedup";
import * as utils from "../utils";

vi.mock("../utils", async () => {
  const actual = await vi.importActual<typeof import("../utils")>("../utils");
  return {
    ...actual,
    sendReport: vi.fn().mockResolvedValue({ success: true, reportId: "r1" }),
  };
});

function lastPayload() {
  const calls = vi.mocked(utils.sendReport).mock.calls;
  return calls[calls.length - 1]?.[0];
}

describe("captureError", () => {
  beforeEach(() => {
    vi.mocked(utils.sendReport).mockClear();
    clearDedupCache();
    clearCaptureConfig();
  });

  it("no-ops when no provider has rendered", () => {
    captureError(new Error("nobody is listening"));
    expect(utils.sendReport).not.toHaveBeenCalled();
  });

  it("sends one SDK_AUTO report for a caught error", async () => {
    render(
      <GlitchgrabProvider token="test-token" session={{ userId: "u1", name: "Vivek" }}>
        <div>App</div>
      </GlitchgrabProvider>
    );

    await act(async () => {
      captureError(new Error("Cannot read properties of undefined (reading 'id')"), {
        componentStack: "\n    at ServicesPage",
        digest: "1234567890",
        boundary: "next-app-router",
      });
    });

    expect(utils.sendReport).toHaveBeenCalledTimes(1);
    const payload = lastPayload();
    expect(payload?.source).toBe("SDK_AUTO");
    expect(payload?.type).toBe("BUG");
    expect(payload?.token).toBe("test-token");
    expect(payload?.errorMessage).toBe(
      "Cannot read properties of undefined (reading 'id')"
    );
    expect(payload?.errorStack).toBeTruthy();
    expect(payload?.componentStack).toBe("\n    at ServicesPage");
    expect(payload?.deviceInfo).toBeTruthy();
    expect(payload?.breadcrumbs).toBeDefined();
    expect(payload?.metadata?.digest).toBe("1234567890");
    expect(payload?.metadata?.boundary).toBe("next-app-router");
    expect(payload?.metadata?.sessionUserId).toBe("u1");
    expect(payload?.metadata?.sessionUserName).toBe("Vivek");
  });

  it("dedups an identical second call — a crash loop files one issue", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    const err = new Error("Render crashed");

    await act(async () => {
      captureError(err);
      captureError(err);
      captureError(err);
    });

    expect(utils.sendReport).toHaveBeenCalledTimes(1);
  });

  it("treats a different digest as a different error", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    // Production Next strips server-boundary errors to one generic message —
    // only the digest separates two genuinely different crashes.
    const generic = () => new Error("An error occurred in the Server Components render.");

    await act(async () => {
      captureError(generic(), { digest: "aaa" });
      captureError(generic(), { digest: "bbb" });
    });

    expect(utils.sendReport).toHaveBeenCalledTimes(2);
  });

  it("reads digest off the error object when not passed explicitly", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    const err = Object.assign(new Error("Server crash"), { digest: "digest-from-error" });

    await act(async () => {
      captureError(err);
    });

    expect(lastPayload()?.metadata?.digest).toBe("digest-from-error");
  });

  it("honours ignoreErrors", async () => {
    render(
      <GlitchgrabProvider token="test-token" ignoreErrors={[/Hydration failed/]}>
        <div>App</div>
      </GlitchgrabProvider>
    );

    await act(async () => {
      captureError(new Error("Hydration failed because the server HTML..."));
    });

    expect(utils.sendReport).not.toHaveBeenCalled();
  });

  it("accepts a non-Error throw without crashing", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    await act(async () => {
      captureError("plain string throw");
    });

    const payload = lastPayload();
    expect(payload?.errorMessage).toBe("plain string throw");
    expect(payload?.errorStack).toBeUndefined();
  });

  it("is exposed from useGlitchgrab() with a stable identity", async () => {
    const seen: Array<(error: unknown) => void> = [];

    function Child() {
      const { captureError: fromHook } = useGlitchgrab();
      seen.push(fromHook);
      return <div>Child</div>;
    }

    const { rerender } = render(
      <GlitchgrabProvider token="test-token">
        <Child />
      </GlitchgrabProvider>
    );

    rerender(
      <GlitchgrabProvider token="test-token">
        <Child />
      </GlitchgrabProvider>
    );

    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);

    await act(async () => {
      seen[0]!(new Error("from the hook"));
    });

    expect(utils.sendReport).toHaveBeenCalledTimes(1);
    expect(lastPayload()?.source).toBe("SDK_AUTO");
  });

  it("captures an error thrown during a child's initial render", async () => {
    // The case the issue is about: the crash unwinds to the framework boundary
    // before any provider effect commits, so the config must exist from render.
    function Boom(): React.ReactNode {
      throw new Error("Crashed on mount");
    }

    render(
      <GlitchgrabProvider
        token="test-token"
        fallback={<p>Something went wrong</p>}
      >
        <Boom />
      </GlitchgrabProvider>
    );

    expect(utils.sendReport).toHaveBeenCalledTimes(1);
    expect(lastPayload()?.errorMessage).toBe("Crashed on mount");
    expect(lastPayload()?.componentStack).toBeTruthy();
    // visitedPages is empty here by nature — the page tracker is an effect, and
    // nothing committed before the crash. `pageUrl` still carries the location.
    expect(lastPayload()?.pageUrl).toBeTruthy();
  });

  it("reads page history from the currently mounted provider, not a stale one", async () => {
    // global-error.tsx unmounts the provider tree. The config must survive that,
    // but the page history it reports has to come from whatever provider is live —
    // a captured array reference would be orphaned and report an empty history.
    const first = render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );
    first.unmount();

    render(
      <GlitchgrabProvider token="test-token">
        <div>App again</div>
      </GlitchgrabProvider>
    );

    await act(async () => {
      captureError(new Error("Crashed after remount"));
    });

    expect(JSON.parse(lastPayload()?.metadata?.visitedPages ?? "[]")).not.toHaveLength(0);
  });
});
