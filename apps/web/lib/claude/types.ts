export interface ToolContext {
  accessToken: string;
  owner: string;
  repo: string;
}

export interface EnrichmentMetrics {
  turns: number;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  cacheHits: number;
  cacheMisses: number;
  toolCalls: number;
  fellBack: boolean;
}

