import { NextResponse } from "next/server";
import { WaError } from "./errors";

/**
 * Every /api/v1/wa route answers `{ success, data? , error?, code? }` — the
 * house shape from CLAUDE.md, plus a stable machine-readable `code` so the SDK
 * can branch on INSUFFICIENT_FUNDS without string-matching a message.
 */

export function waOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function waFail(err: unknown) {
  if (err instanceof WaError) {
    return NextResponse.json(
      { success: false, error: err.message, code: err.code, ...(err.detail ? { detail: err.detail } : {}) },
      { status: err.status }
    );
  }

  // Never leak an internal message to a platform integration.
  console.error("[wa] unhandled route error:", err);
  return NextResponse.json({ success: false, error: "Internal error", code: "INTERNAL" }, { status: 500 });
}
