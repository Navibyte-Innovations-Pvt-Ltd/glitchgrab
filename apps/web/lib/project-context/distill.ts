import { prisma } from "@/lib/db";
import { geminiChat } from "@/lib/gemini/client";
import { deepseekChat } from "@/lib/deepseek/client";
import { DISTILL_SYSTEM_PROMPT, buildDistillUserPrompt } from "./prompt";
import { parseDistillation } from "./parse";
import { markSourceDistilled, type DistillableSource } from "./sources";

/**
 * Distillation service (#311 Phase A) — raw project material in, structured
 * `ProjectContextItem` rows out.
 *
 * Model chain matches narration: gemini-2.5-pro primary, deepseek-v4-flash
 * fallback. Distillation is a strict-format extraction task, which is exactly
 * where pro earns its keep and where a thinking model tends to drift.
 *
 * Triggering is **always explicit** — a dashboard press. Nothing here runs on
 * report ingest: a Gemini call per inbound bug report is an uncapped bill on a
 * volume we don't control.
 */

export interface DistillResult {
  /** Sources that produced at least one item. */
  sourcesDistilled: number;
  /** Sources attempted, including ones that yielded nothing. */
  sourcesAttempted: number;
  itemsCreated: number;
  /** Sources whose model call failed outright. The run continues past them. */
  failures: number;
}

/** One source → parsed items. Never throws; a dead model call yields `[]`. */
async function distillOne(source: DistillableSource): Promise<ReturnType<typeof parseDistillation>> {
  const messages = [
    { role: "system" as const, content: DISTILL_SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: buildDistillUserPrompt({
        sourceLabel: source.label,
        occurredAt: source.occurredAt.toISOString().slice(0, 10),
        text: source.text,
      }),
    },
  ];

  // Extraction wants determinism, not flair — temperature stays near zero so
  // the same report distills the same way twice.
  let raw: string;
  try {
    raw = await geminiChat({ model: "gemini-2.5-pro", messages, temperature: 0.2, maxTokens: 2048 });
  } catch {
    try {
      raw = await deepseekChat({
        model: "deepseek-v4-flash",
        messages,
        temperature: 0.2,
        maxTokens: 2048,
      });
    } catch {
      return [];
    }
  }

  return parseDistillation(raw);
}

/**
 * Distill a batch of sources into one repo's context.
 *
 * Sources run sequentially on purpose: a backfill of 25 reports fired in
 * parallel is 25 concurrent Gemini calls and a rate-limit wall, and this runs
 * behind an explicit press where a few extra seconds costs nothing.
 */
export async function distillSources(params: {
  repoId: string;
  userId: string;
  sources: DistillableSource[];
}): Promise<DistillResult> {
  const result: DistillResult = {
    sourcesDistilled: 0,
    sourcesAttempted: 0,
    itemsCreated: 0,
    failures: 0,
  };

  for (const source of params.sources) {
    result.sourcesAttempted++;

    let items: ReturnType<typeof parseDistillation>;
    try {
      items = await distillOne(source);
    } catch {
      // Leave the stamp off — a source we never got an answer for stays queued
      // and is retried on the next press. Only a real answer marks it done.
      result.failures++;
      continue;
    }

    if (items.length === 0) {
      // "Nothing durable in here" IS the answer. Stamp it so the queue drains
      // and the same dead report isn't re-sent to the model forever.
      await markSourceDistilled(source);
      continue;
    }

    const created = await prisma.projectContextItem.createMany({
      data: items.map((item) => ({
        repoId: params.repoId,
        kind: item.kind,
        text: item.text,
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        occurredAt: source.occurredAt,
        confidence: item.confidence,
        createdById: params.userId,
      })),
    });

    await markSourceDistilled(source);

    result.sourcesDistilled++;
    result.itemsCreated += created.count;
  }

  return result;
}

/**
 * Distill pasted free text — call notes, a WhatsApp thread, an email.
 *
 * This is the path that proves the value before any recording code exists, and
 * later it is simply what a transcript flows through. `occurredAt` is the
 * caller's (when the call happened), defaulting to now.
 */
export async function distillManualText(params: {
  repoId: string;
  userId: string;
  text: string;
  occurredAt?: Date;
}): Promise<DistillResult> {
  const source: DistillableSource = {
    sourceType: "MANUAL",
    sourceId: null,
    label: "Pasted notes",
    occurredAt: params.occurredAt ?? new Date(),
    text: params.text,
  };

  return distillSources({ repoId: params.repoId, userId: params.userId, sources: [source] });
}
