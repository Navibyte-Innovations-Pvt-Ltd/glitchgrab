export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateMagicToken, qaLink } from "@/lib/qa";
import { sendTesterInvite } from "@/lib/whatsapp";
import { ensureRepoWebhook } from "@/lib/github";

/** Resolve org by slug and require the caller to be its OWNER. */
async function requireOwner(slug: string, userId: string) {
  const org = await prisma.organization.findUnique({ where: { githubOrgLogin: slug } });
  if (!org) return { error: NextResponse.json({ success: false, error: "Org not found" }, { status: 404 }) };
  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: org.id, userId } },
  });
  if (!member || member.role !== "OWNER") {
    return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }
  return { org };
}

/** GET /api/v1/orgs/[slug]/testers — list testers with their assigned repos. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const { org, error } = await requireOwner(slug, session.user.id);
  if (error) return error;

  const testers = await prisma.tester.findMany({
    where: { orgId: org.id },
    include: {
      repos: { include: { repo: { select: { id: true, fullName: true } } } },
      _count: { select: { checks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: testers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      qaUrl: qaLink(t.magicToken),
      repos: t.repos.map((r) => ({ id: r.repo.id, fullName: r.repo.fullName })),
      checkCount: t._count.checks,
      createdAt: t.createdAt,
    })),
  });
}

/**
 * POST /api/v1/orgs/[slug]/testers — invite a tester.
 * Body: { name, phone?, email?, repoIds: string[] }
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const { org, error } = await requireOwner(slug, session.user.id);
  if (error) return error;

  const { name, phone, email, repoIds } = (await request.json()) as {
    name?: string;
    phone?: string;
    email?: string;
    repoIds?: string[];
  };

  if (!name?.trim()) {
    return NextResponse.json({ success: false, error: "name required" }, { status: 400 });
  }

  // Only accept repoIds that actually belong to this org
  const validRepoIds = Array.isArray(repoIds) && repoIds.length
    ? (await prisma.repo.findMany({
        where: { id: { in: repoIds }, orgId: org.id },
        select: { id: true },
      })).map((r) => r.id)
    : [];

  const magicToken = generateMagicToken();

  const tester = await prisma.tester.create({
    data: {
      orgId: org.id,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.replace(/\D/g, "") || null,
      magicToken,
      invitedById: session.user.id,
      repos: { create: validRepoIds.map((repoId) => ({ repoId })) },
    },
    include: { repos: { include: { repo: { select: { id: true, fullName: true } } } } },
  });

  // Make sure each assigned repo's GitHub webhook is subscribed to pull_request
  // (older hooks only had issues/issue_comment). Without this, a merged PR never
  // reaches us and no QA check is ever created — the whole tester flow is silent.
  if (tester.repos.length > 0) {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "github" },
      select: { access_token: true },
    });
    if (account?.access_token) {
      const token = account.access_token;
      await Promise.all(
        tester.repos.map((tr) => {
          const [repoOwner, ...rest] = tr.repo.fullName.split("/");
          return ensureRepoWebhook(token, repoOwner, rest.join("/"));
        })
      );
    }
  }

  // WhatsApp welcome with their QA link. Must be awaited — on Vercel the function
  // suspends right after the response returns, killing any un-awaited outbound
  // fetch mid-TLS-handshake (ECONNRESET), so a fire-and-forget send never lands.
  if (tester.phone) {
    await sendTesterInvite({
      phone: tester.phone,
      testerName: tester.name,
      orgName: org.name,
      magicToken,
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: tester.id,
      name: tester.name,
      email: tester.email,
      phone: tester.phone,
      qaUrl: qaLink(magicToken),
      repos: tester.repos.map((r) => ({ id: r.repo.id, fullName: r.repo.fullName })),
      checkCount: 0,
      createdAt: tester.createdAt,
    },
  });
}
