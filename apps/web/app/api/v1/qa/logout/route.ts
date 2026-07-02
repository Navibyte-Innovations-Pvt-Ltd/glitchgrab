export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { TESTER_COOKIE_NAME } from "@/lib/tester-session";

/** POST /api/v1/qa/logout — clear the tester session cookie. */
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(TESTER_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
