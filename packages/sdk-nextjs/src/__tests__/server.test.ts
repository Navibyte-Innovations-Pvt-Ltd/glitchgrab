/**
 * `glitchgrab/server` — the Node-side reporter.
 *
 * What these lock down is mostly the API contract on the other end: a report
 * that reaches `/api/v1/sdk/report` without `source: "SDK_AUTO"` gets no dedup
 * signature, and one without a non-empty `errorMessage` cannot have a
 * signature computed at all. Either mistake turns a cron that fails hourly
 * into twenty-four identical GitHub issues a day, and neither shows up as an
 * error anywhere — the reports all succeed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureServerErrors,
  configureServerReporter,
  reportServerError,
  resetServerReporter,
} from "../server";

const TOKEN = "gg_0123456789abcdef0123456789abcdef";

interface SentBody {
  source: string;
  type?: string;
  errorMessage?: string;
  errorStack?: string;
  description?: string;
  pageUrl?: string;
  metadata?: Record<string, string>;
}

function okResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { issueNumber: 7 } }),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

function lastBody(): SentBody {
  const call = fetchMock.mock.calls.at(-1);
  return JSON.parse((call?.[1] as { body: string }).body) as SentBody;
}

beforeEach(() => {
  resetServerReporter();
  fetchMock = vi.fn(async () => okResponse());
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NODE_ENV", "production");
  delete process.env.GLITCHGRAB_TOKEN;
  delete process.env.GLITCHGRAB_BASE_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetServerReporter();
});

describe("reportServerError", () => {
  it("sends nothing when no token is configured", async () => {
    const result = await reportServerError(new Error("boom"));

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the token from GLITCHGRAB_TOKEN", async () => {
    process.env.GLITCHGRAB_TOKEN = TOKEN;

    await reportServerError(new Error("boom"));

    const headers = (fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> }).headers;
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  // Without SDK_AUTO the API skips dedup entirely (route.ts gates on the exact
  // string), so a recurring cron failure would open one issue per occurrence.
  it("always sends source SDK_AUTO so server-side dedup applies", async () => {
    configureServerReporter({ token: TOKEN });

    await reportServerError(new Error("Timeout"));

    expect(lastBody().source).toBe("SDK_AUTO");
  });

  it("carries the message and stack of a thrown Error", async () => {
    configureServerReporter({ token: TOKEN });
    const error = new Error("SMTP greeting never received");

    await reportServerError(error);

    const body = lastBody();
    expect(body.errorMessage).toBe("SMTP greeting never received");
    expect(body.errorStack).toContain("SMTP greeting never received");
    expect(body.type).toBe("BUG");
  });

  // computeReportSignature returns null on an empty message, and a report with
  // no signature is never deduped — so every shape must yield some message.
  it.each([
    ["a thrown string", "database exploded", "database exploded"],
    ["a rejected object", { message: "Invalid parameter" }, "Invalid parameter"],
    ["an empty rejection", undefined, "Unknown server error"],
    ["a thrown null", null, "Unknown server error"],
  ])("produces a non-empty errorMessage for %s", async (_label, thrown, expected) => {
    configureServerReporter({ token: TOKEN });

    await reportServerError(thrown);

    expect(lastBody().errorMessage).toBe(expected);
  });

  it("turns context into a synthetic pageUrl that groups per job", async () => {
    configureServerReporter({ token: TOKEN });

    await reportServerError(new Error("Timeout"), { context: "cron/attendance-prompts" });

    const body = lastBody();
    expect(body.pageUrl).toBe("server://cron/attendance-prompts");
    expect(body.metadata?.serverContext).toBe("cron/attendance-prompts");
  });

  // The API answers a localhost pageUrl with 200 and creates nothing. Only
  // http(s) matches its check, so the synthetic scheme has to stay non-http.
  it("never builds an http pageUrl the API would treat as localhost", async () => {
    configureServerReporter({ token: TOKEN });

    await reportServerError(new Error("boom"), { context: "localhost:4444/cron" });

    expect(lastBody().pageUrl?.startsWith("server://")).toBe(true);
  });

  it("prefers a real request URL over the context", async () => {
    configureServerReporter({ token: TOKEN });

    await reportServerError(new Error("boom"), {
      context: "api/tasks",
      pageUrl: "https://app.example.com/api/tasks",
    });

    expect(lastBody().pageUrl).toBe("https://app.example.com/api/tasks");
  });

  it("attributes the report to the job when no reporter is given", async () => {
    configureServerReporter({ token: TOKEN });

    await reportServerError(new Error("boom"), { context: "cron/digest" });

    const metadata = lastBody().metadata ?? {};
    expect(metadata.sessionUserId).toBe("cron/digest");
    expect(metadata.sessionUserName).toBe("Server");
    expect(metadata.runtime).toBe("node");
  });

  it("lets a call override the configured defaults", async () => {
    configureServerReporter({ token: TOKEN, context: "worker", metadata: { service: "api" } });

    await reportServerError(new Error("boom"), {
      context: "cron/digest",
      metadata: { service: "cron" },
      severity: "high",
    });

    const body = lastBody();
    expect(body.metadata?.serverContext).toBe("cron/digest");
    expect(body.metadata?.service).toBe("cron");
    expect(body.metadata?.severity).toBe("high");
  });

  // The browser SDK stops auto-capture in development. A server has no Origin
  // header, so the API's own localhost guard cannot see a dev machine — this
  // check is the only thing between a refactor and a stream of real issues.
  it("stays silent in development unless explicitly enabled", async () => {
    vi.stubEnv("NODE_ENV", "development");
    configureServerReporter({ token: TOKEN });

    expect(await reportServerError(new Error("boom"))).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    await reportServerError(new Error("boom"), { enableInDevelopment: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null instead of throwing when the network fails", async () => {
    configureServerReporter({ token: TOKEN });
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(reportServerError(new Error("boom"))).resolves.toBeNull();
  });
});

describe("captureServerErrors", () => {
  it("observes uncaught exceptions without taking the crash over", () => {
    configureServerReporter({ token: TOKEN });
    const before = process.listenerCount("uncaughtException");

    const stop = captureServerErrors();

    // `uncaughtExceptionMonitor` reports without suppressing the default
    // behaviour; a plain `uncaughtException` listener would keep a broken
    // process alive, which is worse than not reporting at all.
    expect(process.listenerCount("uncaughtExceptionMonitor")).toBe(1);
    expect(process.listenerCount("uncaughtException")).toBe(before);

    stop();
    expect(process.listenerCount("uncaughtExceptionMonitor")).toBe(0);
  });

  it("removes the rejection listener again", () => {
    configureServerReporter({ token: TOKEN });
    const before = process.listenerCount("unhandledRejection");

    const stop = captureServerErrors();
    expect(process.listenerCount("unhandledRejection")).toBe(before + 1);

    stop();
    expect(process.listenerCount("unhandledRejection")).toBe(before);
  });

  it("can skip rejection capture", () => {
    configureServerReporter({ token: TOKEN });
    const before = process.listenerCount("unhandledRejection");

    const stop = captureServerErrors({ captureUnhandledRejections: false });
    expect(process.listenerCount("unhandledRejection")).toBe(before);

    stop();
  });
});
