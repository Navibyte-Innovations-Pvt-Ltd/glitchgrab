import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { GlitchgrabProvider } from "../provider";
import { captureError, clearCaptureConfig } from "../capture";
import { clearAppContext, clearRelease, setContext, setContexts } from "../app-context";
import { resetErrorCount } from "../runtime";
import { clearDedupCache } from "../dedup";
import { redactBody } from "../redact";
import {
  clearBreadcrumbs,
  clearResponseBodyOrigins,
  getBreadcrumbs,
} from "../breadcrumbs";
import * as utils from "../utils";

vi.mock("../utils", async () => {
  const actual = await vi.importActual<typeof import("../utils")>("../utils");
  return {
    ...actual,
    sendReport: vi.fn().mockResolvedValue({ success: true, reportId: "r1" }),
  };
});

function lastMetadata() {
  const calls = vi.mocked(utils.sendReport).mock.calls;
  return calls[calls.length - 1]?.[0]?.metadata;
}

beforeEach(() => {
  vi.mocked(utils.sendReport).mockClear();
  clearDedupCache();
  clearCaptureConfig();
  clearAppContext();
  clearRelease();
  resetErrorCount();
  clearBreadcrumbs();
  clearResponseBodyOrigins();
});

/** Drive the patched XHR prototype — jsdom performs no real requests. */
function fakeXhr(
  method: string,
  url: string,
  status?: number,
  responseText?: string
): XMLHttpRequest {
  const xhr = new XMLHttpRequest();
  xhr.open(method, url);
  if (status !== undefined) {
    Object.defineProperty(xhr, "status", { value: status, configurable: true });
  }
  if (responseText !== undefined) {
    Object.defineProperty(xhr, "responseText", { value: responseText, configurable: true });
  }
  xhr.dispatchEvent(new Event("loadend"));
  return xhr;
}

const apiCrumbs = () => getBreadcrumbs().filter((b) => b.type === "api");

describe("app context", () => {
  it("attaches setContext values to reports, namespaced", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    setContext("orgId", "org_42");
    setContexts({ plan: "enterprise", betaBilling: true });

    await act(async () => {
      captureError(new Error("Crash with tenant context"));
    });

    const metadata = lastMetadata();
    expect(metadata?.ctx_orgId).toBe("org_42");
    expect(metadata?.ctx_plan).toBe("enterprise");
    expect(metadata?.ctx_betaBilling).toBe("true");
  });

  it("namespacing stops app keys clobbering report fields", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    setContext("timestamp", "not-a-real-timestamp");

    await act(async () => {
      captureError(new Error("Crash with a hostile key"));
    });

    const metadata = lastMetadata();
    expect(metadata?.ctx_timestamp).toBe("not-a-real-timestamp");
    expect(metadata?.timestamp).not.toBe("not-a-real-timestamp");
  });

  it("removes a key when set to null", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    setContext("orgId", "org_42");
    setContext("orgId", null);

    await act(async () => {
      captureError(new Error("Crash after leaving the org"));
    });

    expect(lastMetadata()?.ctx_orgId).toBeUndefined();
  });

  it("accepts context from the provider prop", async () => {
    render(
      <GlitchgrabProvider token="test-token" context={{ tenant: "acme" }}>
        <div>App</div>
      </GlitchgrabProvider>
    );

    await act(async () => {
      captureError(new Error("Crash with prop context"));
    });

    expect(lastMetadata()?.ctx_tenant).toBe("acme");
  });
});

describe("release", () => {
  it("attaches the release prop to reports", async () => {
    render(
      <GlitchgrabProvider token="test-token" release="v2.4.1">
        <div>App</div>
      </GlitchgrabProvider>
    );

    await act(async () => {
      captureError(new Error("Crash in a known build"));
    });

    expect(lastMetadata()?.release).toBe("v2.4.1");
  });

  it("omits release when nothing is configured", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    await act(async () => {
      captureError(new Error("Crash in an unknown build"));
    });

    expect(lastMetadata()?.release).toBeUndefined();
  });
});

describe("runtime health", () => {
  it("attaches time on page, visibility and a running error count", async () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    await act(async () => {
      captureError(new Error("First crash"));
      captureError(new Error("Second crash"));
    });

    const metadata = lastMetadata();
    expect(metadata?.errorCount).toBe("2");
    expect(metadata?.visibility).toBeTruthy();
    expect(Number(metadata?.timeOnPageMs)).toBeGreaterThanOrEqual(0);
  });
});

describe("redactBody", () => {
  it("drops values of sensitively-named JSON keys", () => {
    const out = redactBody(
      JSON.stringify({ message: "Invalid login", password: "hunter2", accessToken: "abc123" })
    );
    expect(out).toContain("Invalid login");
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("abc123");
  });

  it("scrubs emails and JWTs out of non-JSON bodies", () => {
    const out = redactBody(
      "Failed for asha@example.com token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghij"
    );
    expect(out).not.toContain("asha@example.com");
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(out).toContain("Failed for");
  });

  it("truncates long bodies", () => {
    const out = redactBody("x".repeat(5000));
    expect(out.length).toBeLessThan(600);
    expect(out).toContain("[truncated]");
  });

  it("survives malformed input", () => {
    expect(redactBody("")).toBe("");
    expect(() => redactBody("{not json")).not.toThrow();
  });
});

describe("XHR breadcrumbs", () => {
  it("records an axios-style XHR call that fetch interception would miss", () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    fakeXhr(
      "POST",
      "/api/v1/services",
      500,
      JSON.stringify({ error: "service_limit_exceeded", password: "hunter2" })
    );

    const api = apiCrumbs();
    expect(api).toHaveLength(1);
    expect(api[0]?.message).toContain("POST");
    expect(api[0]?.message).toContain("→ 500");
    expect(api[0]?.data?.responseBody).toContain("service_limit_exceeded");
    expect(api[0]?.data?.responseBody).not.toContain("hunter2");
  });

  it("records a network-level XHR failure as FAILED", () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    fakeXhr("GET", "/api/v1/ping");

    expect(apiCrumbs()[0]?.message).toContain("→ FAILED");
  });

  it("writes one breadcrumb per request when an XHR instance is reused", () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    // open/send/open/send on one instance is legal. A listener attached per open()
    // would leave a stale one behind and describe the wrong request.
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/first");
    Object.defineProperty(xhr, "status", { value: 404, configurable: true });
    xhr.dispatchEvent(new Event("loadend"));

    xhr.open("POST", "/api/second");
    xhr.dispatchEvent(new Event("loadend"));

    const api = apiCrumbs();
    expect(api).toHaveLength(2);
    expect(api[0]?.message).toContain("/api/first");
    expect(api[1]?.message).toContain("/api/second");
    expect(api[1]?.message).toContain("POST");
  });

  it("does not open() twice into a duplicate breadcrumb", () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/aborted");
    xhr.open("GET", "/api/real");
    Object.defineProperty(xhr, "status", { value: 200, configurable: true });
    xhr.dispatchEvent(new Event("loadend"));

    const api = apiCrumbs();
    expect(api).toHaveLength(1);
    expect(api[0]?.message).toContain("/api/real");
  });
});

describe("error response bodies stay first-party", () => {
  it("captures the body for a same-origin failure", () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    fakeXhr("POST", "/api/v1/compliance", 422, JSON.stringify({ error: "due_date_required" }));

    expect(apiCrumbs()[0]?.data?.responseBody).toContain("due_date_required");
  });

  it("records a third-party failure but never its body", () => {
    render(
      <GlitchgrabProvider token="test-token">
        <div>App</div>
      </GlitchgrabProvider>
    );

    // A vendor's 422 echoes fields no key-based redactor can anticipate. The
    // breadcrumb still proves the call failed; the payload stays in the browser.
    fakeXhr(
      "POST",
      "https://api.stripe.com/v1/customers",
      422,
      JSON.stringify({ errors: { dob: "1987-04-12", phone_number: "+919876543210" } })
    );

    const crumb = apiCrumbs()[0];
    expect(crumb?.message).toContain("→ 422");
    expect(crumb?.data?.responseBody).toBeUndefined();
  });

  it("captures a third-party body once its origin is allowlisted", () => {
    render(
      <GlitchgrabProvider
        token="test-token"
        responseBodyOrigins={["https://api.myapp.com"]}
      >
        <div>App</div>
      </GlitchgrabProvider>
    );

    fakeXhr(
      "GET",
      "https://api.myapp.com/v1/reports",
      500,
      JSON.stringify({ error: "upstream_timeout" })
    );

    expect(apiCrumbs()[0]?.data?.responseBody).toContain("upstream_timeout");
  });
});

describe("error count", () => {
  it("counts a boundary-caught render crash once", async () => {
    function Boom(): React.ReactNode {
      throw new Error("Crashed on mount");
    }

    render(
      <GlitchgrabProvider token="test-token" fallback={<p>Something went wrong</p>}>
        <Boom />
      </GlitchgrabProvider>
    );

    // If the boundary and a window listener both counted it, errorCount would
    // read 2 and stop meaning anything.
    expect(lastMetadata()?.errorCount).toBe("1");
  });
});
