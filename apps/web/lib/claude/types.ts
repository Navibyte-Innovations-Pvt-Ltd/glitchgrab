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

