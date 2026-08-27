import { prisma } from "@/lib/db";

/**
 * The assistant's transcript store.
 *
 * Both sides of every chat are kept, in order, stamped with the turn they
 * belong to. The question this exists to answer is the one nobody could answer
 * before: **how many prompts does a filed issue actually cost** — and, read
 * alongside the text, which questions the model had to ask to get there. That
 * is the training set for the next version of the prompt.
 *
 * What is NOT stored: the screenshot. It is up to `MAX_SCREENSHOT_CHARS` of
 * base64 per turn and the only signal in it is that the model could see one, so
 * a boolean carries it.
 *
 * Everything here is best-effort and swallows its own errors — same rule as
 * `markConversationOutcome`. A reporter is waiting on the reply; an analytics
 * insert must never be the thing that fails it.
 */

/** A message longer than this is a paste, not a prompt. Bounded on the way in. */
const MAX_STORED_CHARS = 8000;

function clip(text: string): string {
  return text.slice(0, MAX_STORED_CHARS);
}

/**
 * Persist one round-trip: what the reporter said, and what came back.
 *
 * Only the TAIL is written. The client resends its whole transcript on every
 * turn, so persisting `messages` wholesale would store turn one N times over.
 * The tail user message plus the reply is exactly the new information, and the
 * rows already on disk are the rest of the conversation.
 */
export async function recordTurn(params: {
  conversationId: string;
  turn: number;
  /** The reporter's newest message — the last entry of the sanitized history. */
  userMessage?: string | null;
  /** What the model answered: its question, or the finished report. */
  assistantMessage?: string | null;
  hadScreenshot: boolean;
}): Promise<void> {
  const { conversationId, turn, hadScreenshot } = params;
  const rows: { conversationId: string; turn: number; role: string; content: string; hadScreenshot: boolean }[] = [];

  const user = params.userMessage?.trim();
  if (user) {
    rows.push({ conversationId, turn, role: "user", content: clip(user), hadScreenshot });
  }
  const assistant = params.assistantMessage?.trim();
  if (assistant) {
    rows.push({ conversationId, turn, role: "assistant", content: clip(assistant), hadScreenshot });
  }
  if (rows.length === 0) return;

  try {
    await prisma.aiAssistMessage.createMany({ data: rows });
  } catch {
    // Nothing to do — the reply is already on its way to the reporter.
  }
}
