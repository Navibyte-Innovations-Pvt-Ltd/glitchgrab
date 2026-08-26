export const dynamic = "force-dynamic";

/**
 * POST /api/v1/ai/report-chat — the report assistant (#330).
 *
 * The reporter chats; the model reads the screenshot, the activity log and the
 * project's own notes and hands back either one question or a finished
 * description. That description lands in the SAME textarea a person types into
 * and is submitted through the SAME deterministic pipeline as every other
 * report. Nothing here creates an issue, and no model sits between a report and
 * GitHub — Glitchgrab's "no AI pipeline" promise is intact.
 *
 * ── Who may call it ─────────────────────────────────────────────────────────
 * Three hosts, three credentials, one rule: the REPO comes from the credential,
 * never from the body.
 *   - SDK end user       → Bearer gg_… token          → that token's one repo
 *   - Chrome extension / → ExtensionSession id        → a repo in that
 *     GlitchRecord                                       session's allowed list
 *   - Dashboard          → NextAuth session           → a repo they may access
 *
 * Then the repo must have `aiAssistEnabled`. The owner decides, because the
 * owner pays — an SDK end user opening this dialog is a stranger to us, and the
 * only person who can consent to spending model budget on them is the person
 * whose project it is.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import { getExtensionSessionIdentity, getExtensionSessionRepos } from "@/lib/extension-session";
import { getAccessibleRepos } from "@/lib/repo-access";
import { assistTurn, type AssistMessage } from "@/lib/ai-assist/chat";
import { claimAssistTurn, markConversationOutcome } from "@/lib/ai-assist/quota";
import { getOpenIssues, rankIssues, resolveIssue } from "@/lib/ai-assist/issues";
import { briefToLines, getGlitchBrief } from "@/lib/ai-assist/glitch-md";
import {
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_SCREENSHOT_CHARS,
  type AssistContext,
} from "@/lib/ai-assist/prompt";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Flood guard, on top of the monthly conversation cap. The cap stops a repo's
 * spend over a month; this stops one credential burning it in a minute.
 */
const BURST_LIMIT = 40;
const BURST_WINDOW_MS = 60 * 60 * 1000;

/** How many project-context lines the model gets. Newest first. */
const PROJECT_NOTE_LIMIT = 15;

interface ChatBody {
  messages?: AssistMessage[];
  conversationId?: string | null;
  screenshot?: string | null;
  context?: AssistContext | null;
  /** SDK: absent (the token IS the repo). Extension/dashboard: required. */
  repoId?: string;
  /** Extension/GlitchRecord only. */
  sessionId?: string;
}

interface Caller {
  repoId: string;
  rateKey: string;
  tokenId?: string | null;
  userId?: string | null;
  testerId?: string | null;
}

/**
 * Resolve the caller to exactly one repo, or to a Response explaining why not.
 * Every branch derives the repo from the credential; `body.repoId` is only ever
 * used to PICK from a server-built allow-list, never trusted on its own.
 */
async function resolveCaller(
  request: Request,
  body: ChatBody
): Promise<Caller | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer gg_")) {
    const tokenHash = hashToken(authHeader.replace("Bearer ", ""));
    const apiToken = await prisma.apiToken.findUnique({
      where: { tokenHash },
      select: { id: true, repoId: true },
    });
    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: "Invalid API token" },
        { status: 401, headers: CORS_HEADERS }
      );
    }
    prisma.apiToken
      .update({ where: { id: apiToken.id }, data: { lastUsed: new Date() } })
      .catch(() => {});
    return { repoId: apiToken.repoId, rateKey: `aiassist:token:${tokenHash}`, tokenId: apiToken.id };
  }

  if (body.sessionId) {
    const identity = await getExtensionSessionIdentity(body.sessionId);
    if (!identity) {
      return NextResponse.json(
        { success: false, error: "Session not found or ended" },
        { status: 401, headers: CORS_HEADERS }
      );
    }
    const allowed = await getExtensionSessionRepos(identity);
    const repo = allowed.find((r) => r.id === body.repoId);
    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Repo not assigned to you" },
        { status: 403, headers: CORS_HEADERS }
      );
    }
    return {
      repoId: repo.id,
      rateKey: `aiassist:session:${body.sessionId}`,
      userId: identity.userId,
      testerId: identity.testerId,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const accessible = await getAccessibleRepos(session.user.id);
  const repo = accessible.find((r) => r.id === body.repoId);
  if (!repo) {
    return NextResponse.json(
      { success: false, error: "Repo not found" },
      { status: 403, headers: CORS_HEADERS }
    );
  }
  return { repoId: repo.id, rateKey: `aiassist:user:${session.user.id}`, userId: session.user.id };
}

/** Trim the client's transcript to something bounded before it reaches a model. */
function sanitizeMessages(raw: unknown): AssistMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is AssistMessage =>
        !!m &&
        typeof m === "object" &&
        (m as AssistMessage).role !== undefined &&
        typeof (m as AssistMessage).content === "string"
    )
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content.trim().slice(0, MAX_MESSAGE_CHARS),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ChatBody;

    const messages = sanitizeMessages(body.messages);
    if (!messages.length) {
      return NextResponse.json(
        { success: false, error: "messages is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const caller = await resolveCaller(request, body);
    if (caller instanceof NextResponse) return caller;

    const repo = await prisma.repo.findUnique({
      where: { id: caller.repoId },
      select: { aiAssistEnabled: true, name: true },
    });
    // A repo with the assistant off is not an error the reporter caused. 403 +
    // `disabled` lets the dialog hide the AI tab and carry on with the plain
    // form rather than showing a failure.
    if (!repo?.aiAssistEnabled) {
      return NextResponse.json(
        { success: false, error: "AI assist is not enabled for this project", disabled: true },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const burst = await checkRateLimit(caller.rateKey, BURST_LIMIT, BURST_WINDOW_MS);
    if (!burst.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests — write your report and send it, it will still be filed.",
          degrade: true,
        },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    const claim = await claimAssistTurn({
      repoId: caller.repoId,
      conversationId: body.conversationId,
      tokenId: caller.tokenId,
      userId: caller.userId,
      testerId: caller.testerId,
    });
    if (!claim.ok) {
      const error =
        claim.reason === "TURN_CAP"
          ? "This conversation has gone on long enough — send what you have and it will be filed."
          : "The AI assistant has hit this project's monthly limit. Write your report below and send it as normal.";
      // `degrade: true` is the contract with the dialog: hide the assistant,
      // keep the form, never block the send.
      return NextResponse.json(
        { success: false, error, degrade: true },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    // Project memory — what the team has already written down about this repo.
    // Read server-side off the resolved repo, so a client cannot ask for
    // another project's notes by putting its id in the body.
    const notes = await prisma.projectContextItem.findMany({
      where: { repoId: caller.repoId },
      select: { text: true },
      orderBy: { occurredAt: "desc" },
      take: PROJECT_NOTE_LIMIT,
    });

    const screenshot =
      typeof body.screenshot === "string" && body.screenshot.length <= MAX_SCREENSHOT_CHARS
        ? body.screenshot
        : null;

    // What is already open on this repo, so the reporter is told "we know" and
    // their words land on the existing thread instead of a fifth copy of it.
    // Titles only, ranked against what they have actually said — a repo with
    // 500 open issues must not send 500 lines into a turn someone is waiting on.
    // The team's own brief, if they wrote one. Read alongside the issue list so
    // one slow GitHub call does not sit behind the other.
    const [openIssues, brief] = await Promise.all([
      getOpenIssues(caller.repoId),
      getGlitchBrief(caller.repoId),
    ]);
    const ranked = rankIssues(openIssues, messages.map((m) => m.content).join(" "));

    const result = await assistTurn({
      messages,
      screenshot,
      context: {
        ...(body.context ?? {}),
        projectName: repo.name,
        projectNotes: notes.map((n) => n.text),
        openIssues: ranked.map((i) => ({ number: i.number, title: i.title })),
        brief: brief ? briefToLines(brief) : undefined,
      },
    });

    // The model's duplicate pick is a claim about untrusted text. It becomes an
    // action only if the number is really one of this repo's open issues —
    // otherwise the report is filed the ordinary way.
    const duplicate = resolveIssue(openIssues, result.duplicate);

    // The brief answered it and nobody had to file anything. Worth counting:
    // it is the only signal a team gets that their GLITCH.md is working.
    if (result.solved) await markConversationOutcome(claim.conversationId, "SOLVED");

    return NextResponse.json(
      {
        success: true,
        data: {
          conversationId: claim.conversationId,
          question: result.question,
          options: result.options,
          solved: result.solved,
          report: result.report,
          duplicate: duplicate
            ? { number: duplicate.number, title: duplicate.title, url: duplicate.url }
            : null,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("AI report-chat error:", error);
    // The model being down must never look like the report being rejected.
    return NextResponse.json(
      {
        success: false,
        error: "The assistant is unavailable right now — write your report below and send it as normal.",
        degrade: true,
      },
      { status: 503, headers: CORS_HEADERS }
    );
  }
}
