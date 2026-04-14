import type { AiAction, AiInput } from "@/lib/ai-types";
import { enrich } from "@/lib/claude/enricher";

export type { AiAction, AiInput, ClarifyQuestion } from "@/lib/ai-types";

export interface ClassifyContext {
  accessToken: string;
  owner: string;
  repo: string;
}

export async function classifyAndGenerate(
  input: AiInput,
  ctx: ClassifyContext,
): Promise<AiAction> {
  const { action, metrics } = await enrich({
    ...input,
    accessToken: ctx.accessToken,
    owner: ctx.owner,
    repo: ctx.repo,
  });

  console.info("[claude-enricher] done", {
    repo: `${ctx.owner}/${ctx.repo}`,
    intent: action.intent,
    ...metrics,
  });

  return action;
}
