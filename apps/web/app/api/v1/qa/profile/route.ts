export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTesterSession } from "@/lib/tester-session";
import { buildTesterUpdateData } from "../../orgs/[slug]/testers/[id]/update-data";

/**
 * PATCH /api/v1/qa/profile — a tester edits their own name/phone/email.
 * Auth: the gg_tester session cookie (OTP login) OR a magic `token` in the body.
 * Body: { name?, phone?, email?, token? }
 */
export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    email?: string;
    token?: string;
  };
  const { token, ...patch } = body;

  const testerId = token
    ? (await prisma.tester.findUnique({ where: { magicToken: token }, select: { id: true } }))?.id
    : await getTesterSession();

  if (!testerId) {
    return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
  }

  const parsed = buildTesterUpdateData(patch);
  if ("error" in parsed) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  await prisma.tester.update({ where: { id: testerId }, data: parsed.data });

  return NextResponse.json({ success: true });
}
