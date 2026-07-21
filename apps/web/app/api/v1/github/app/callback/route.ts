export const dynamic = "force-dynamic";

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchInstallationMeta } from "@/lib/github-app";

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function verifyState(stateParam: string): string | null {
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8")) as {
      payload: string;
      sig: string;
    };

    const secret = process.env.AUTH_SECRET ?? "";
    const expected = createHmac("sha256", secret).update(decoded.payload).digest("hex");

    if (!timingSafeEqual(Buffer.from(decoded.sig, "hex"), Buffer.from(expected, "hex"))) {
      return null;
    }

    const { userId, ts } = JSON.parse(decoded.payload) as { userId: string; ts: number };
    if (Date.now() - ts > STATE_MAX_AGE_MS) return null;

    return userId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const stateParam = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!installationId) {
    return NextResponse.redirect(`${appUrl}/dashboard/repos?error=missing_installation`);
  }

  // `state` is absent when a user installs the App directly from GitHub's App page
  // rather than via our "Install" link — still valid, just can't auto-link repos yet.
  const userId = stateParam ? verifyState(stateParam) : null;

  try {
    const meta = await fetchInstallationMeta(Number(installationId));
    if (!meta) {
      return NextResponse.redirect(`${appUrl}/dashboard/repos?error=installation_not_found`);
    }

    const installation = await prisma.installation.upsert({
      where: { installationId: Number(installationId) },
      create: {
        installationId: Number(installationId),
        accountLogin: meta.accountLogin,
        accountType: meta.accountType,
      },
      update: {
        accountLogin: meta.accountLogin,
        accountType: meta.accountType,
      },
    });

    // Auto-link any repos THIS authenticated user already connected under the same
    // GitHub owner. Deliberately scoped to `userId` from the verified `state` —
    // without it, we'd link installationId onto other users' tracked repos just
    // because someone with install-permission on that GitHub account hit this
    // callback directly (e.g. installing from GitHub's App page, bypassing our
    // signed install link). If state is missing, the Installation row above is
    // still stored, but no repo gets linked here — the user must go through our
    // "install" link (which carries state) to complete the link themselves.
    if (userId) {
      await prisma.repo.updateMany({
        where: { userId, owner: meta.accountLogin, installationId: null },
        data: { installationId: installation.id },
      });
    }

    return NextResponse.redirect(`${appUrl}/dashboard/repos?installed=1`);
  } catch (error) {
    console.error("GitHub App install callback error:", error);
    return NextResponse.redirect(`${appUrl}/dashboard/repos?error=install_failed`);
  }
}
