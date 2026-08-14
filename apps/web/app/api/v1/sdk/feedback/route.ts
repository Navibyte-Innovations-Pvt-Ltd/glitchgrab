export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * End-user feedback intake (#309).
 *
 * This is NOT feedback about Glitchgrab — it is feedback the SDK consumer's own
 * end-users leave about the consumer's app. Glitchgrab stores it so the consumer
 * doesn't have to write a table, a route, and a migration for it. Nothing here
 * touches GitHub: feedback never becomes an issue.
 *
 * The repo is always derived from the hashed gg_ token, never from the body.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const MAX_MESSAGE_LENGTH = 5000;
/** Feedback is a deliberate human action, so a looser cap than error capture. */
const FEEDBACK_RATE_LIMIT = 30;

interface SdkFeedbackBody {
  rating?: number;
  message?: string;
  pageUrl?: string;
  userAgent?: string;
  metadata?: Record<string, string>;
}

interface ResolvedToken {
  id: string;
  repoId: string;
}

/** Resolves the Bearer gg_ token to its ApiToken row, or an error response. */
async function resolveToken(
  request: Request
): Promise<{ token: ResolvedToken } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer gg_")) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid or missing API token" },
        { status: 401, headers: CORS_HEADERS }
      ),
    };
  }

  const tokenHash = hashToken(authHeader.replace("Bearer ", ""));
  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: { id: true, repoId: true },
  });

  if (!apiToken) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid API token" },
        { status: 401, headers: CORS_HEADERS }
      ),
    };
  }

  return { token: apiToken };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/v1/sdk/feedback
 *
 * Headers:
 *   Authorization: Bearer gg_xxxxx
 *
 * Body:
 *   { rating: 1-5, message?, pageUrl?, userAgent?, metadata? }
 *
 * Reporter identity comes from the SDK session metadata (sessionUserId etc.),
 * the same convention the report intake uses.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SdkFeedbackBody;

    const resolved = await resolveToken(request);
    if ("error" in resolved) return resolved.error;
    const apiToken = resolved.token;

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "rating must be an integer between 1 and 5" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const message = body.message?.trim().slice(0, MAX_MESSAGE_LENGTH) || null;

    // Rate limit on a feedback-specific key so a burst of feedback can't eat the
    // report budget (and vice versa).
    const rateLimit = await checkRateLimit(`feedback:${apiToken.id}`, FEEDBACK_RATE_LIMIT);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded", retryAfter },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsed: new Date() },
    });

    const feedback = await prisma.feedback.create({
      data: {
        repoId: apiToken.repoId,
        tokenId: apiToken.id,
        rating,
        message,
        pageUrl: body.pageUrl || null,
        userAgent: body.userAgent || null,
        metadata: body.metadata ? JSON.parse(JSON.stringify(body.metadata)) : undefined,
        reporterPrimaryKey: body.metadata?.sessionUserId || "unknown",
        reporterName: body.metadata?.sessionUserName || "Unknown",
        reporterEmail: body.metadata?.sessionUserEmail || null,
        reporterPhone: body.metadata?.sessionUserPhone || null,
      },
      select: { id: true, rating: true, createdAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          feedbackId: feedback.id,
          rating: feedback.rating,
          createdAt: feedback.createdAt,
          message: "Feedback saved",
        },
      },
      {
        headers: {
          ...CORS_HEADERS,
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
        },
      }
    );
  } catch (error) {
    console.error("SDK feedback create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * GET /api/v1/sdk/feedback
 *
 * Read back the feedback for this token's repo — lets the consumer render it in
 * their own app (a testimonials wall, a "your past feedback" list, etc.).
 *
 * Query params:
 *   ?approved=true                 — only entries the owner approved (public display)
 *   ?reporterPrimaryKey=user_123   — only this end-user's feedback
 *   ?minRating=4                   — floor on the star rating
 *   ?limit=20                      — max results (default 50, max 100)
 *
 * Email/phone are omitted: this response is designed to be safe to render in a
 * public page of the consumer's app.
 */
export async function GET(request: Request) {
  try {
    const resolved = await resolveToken(request);
    if ("error" in resolved) return resolved.error;
    const apiToken = resolved.token;

    const url = new URL(request.url);
    const approvedOnly = url.searchParams.get("approved") === "true";
    const reporterPrimaryKey = url.searchParams.get("reporterPrimaryKey");
    const minRatingParam = Number(url.searchParams.get("minRating"));
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 100);

    const feedback = await prisma.feedback.findMany({
      where: {
        repoId: apiToken.repoId,
        ...(approvedOnly ? { approved: true } : {}),
        ...(reporterPrimaryKey ? { reporterPrimaryKey } : {}),
        ...(Number.isInteger(minRatingParam) && minRatingParam >= 1 && minRatingParam <= 5
          ? { rating: { gte: minRatingParam } }
          : {}),
      },
      select: {
        id: true,
        rating: true,
        message: true,
        pageUrl: true,
        approved: true,
        reporterPrimaryKey: true,
        reporterName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: feedback }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("SDK feedback fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
