export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import { enhanceText } from "@/lib/ai-enhance";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// Stricter than the 60/hr default — LLM calls cost money
const ENHANCE_LIMIT = 20;
const ENHANCE_WINDOW_MS = 60 * 60 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface EnhanceContext {
  url?: string;
  visitedPages?: string[];
  breadcrumbs?: Array<{ type: string; message: string }>;
}

interface EnhanceBody {
  text?: string;
  screenshot?: string;
  context?: EnhanceContext;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as EnhanceBody;
    const text = (body.text ?? "").trim();
    const screenshot = body.screenshot ?? null;
    const context = body.context ?? null;

    if (!text) {
      return NextResponse.json(
        { success: false, error: "text is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Auth: either a Bearer gg_ token OR a dashboard session.
    // Anonymous traffic is rejected with 401.
    let rateLimitKey: string | null = null;
    let apiTokenId: string | null = null;
    let userId: string | null = null;

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer gg_")) {
      const plainToken = authHeader.replace("Bearer ", "");
      const tokenHash = hashToken(plainToken);
      const apiToken = await prisma.apiToken.findUnique({
        where: { tokenHash },
        select: { id: true },
      });
      if (apiToken) {
        // Bump lastUsed (don't await — non-critical)
        prisma.apiToken
          .update({ where: { id: apiToken.id }, data: { lastUsed: new Date() } })
          .catch(() => {});
        rateLimitKey = `token:${tokenHash}`;
        apiTokenId = apiToken.id;
      }
    }

    // Fall through to session auth if token not found (e.g. dashboard using SDK with its own token)
    if (!rateLimitKey) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401, headers: CORS_HEADERS }
        );
      }
      rateLimitKey = `user:${session.user.id}`;
      userId = session.user.id;
    }

    const rl = await checkRateLimit(rateLimitKey, ENHANCE_LIMIT, ENHANCE_WINDOW_MS);
    if (!rl.allowed) {
      const retryAfter = Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded", retryAfter },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rl.resetAt.toISOString(),
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    const enhanced = await enhanceText(text, screenshot, context);

    // Save enhance log async — fire-and-forget, never blocks the response
    prisma.aiEnhanceLog.create({
      data: {
        originalText: text,
        enhancedText: enhanced,
        changed: enhanced !== text,
        pageUrl: context?.url ?? null,
        apiTokenId,
        userId,
      },
    }).catch(() => {});

    return NextResponse.json(
      { success: true, data: { text: enhanced } },
      {
        headers: {
          ...CORS_HEADERS,
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": rl.resetAt.toISOString(),
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
