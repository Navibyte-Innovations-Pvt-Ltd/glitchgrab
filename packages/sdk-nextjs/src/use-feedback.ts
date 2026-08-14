"use client";

import { useState, useEffect, useCallback } from "react";
import type { GlitchgrabFeedback } from "./types";

const DEFAULT_BASE_URL = "https://glitchgrab.dev";

export interface FeedbackQuery {
  token: string;
  /** Only entries the repo owner published — use this for a public testimonials wall */
  approvedOnly?: boolean;
  /** Only this end-user's feedback (their primary key in your DB) */
  userId?: string;
  /** Floor on the star rating, 1–5 */
  minRating?: number;
  /** Max results (default 50, max 100) */
  limit?: number;
  baseUrl?: string;
}

function buildUrl({
  approvedOnly,
  userId,
  minRating,
  limit = 50,
  baseUrl,
}: Omit<FeedbackQuery, "token">): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (approvedOnly) params.set("approved", "true");
  if (userId) params.set("reporterPrimaryKey", userId);
  if (minRating) params.set("minRating", String(minRating));
  return `${baseUrl ?? DEFAULT_BASE_URL}/api/v1/sdk/feedback?${params.toString()}`;
}

/**
 * Standalone fetcher — use with TanStack Query or any data fetching library.
 *
 * ```tsx
 * const { data } = useQuery({
 *   queryKey: ["testimonials"],
 *   queryFn: () => fetchGlitchgrabFeedback({
 *     token: process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!,
 *     approvedOnly: true,
 *     minRating: 4,
 *   }),
 * });
 * ```
 */
export async function fetchGlitchgrabFeedback(
  query: FeedbackQuery
): Promise<GlitchgrabFeedback[]> {
  const res = await fetch(buildUrl(query), {
    headers: { Authorization: `Bearer ${query.token}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Failed to fetch feedback");
  return data.data ?? [];
}

/**
 * Hook to read back the feedback your end-users left — render it as a
 * testimonials wall, or show a user their own past ratings.
 *
 * ```tsx
 * const { feedback, isLoading, error, refetch } = useGlitchgrabFeedback({
 *   token: process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!,
 *   approvedOnly: true,
 * });
 * ```
 */
export function useGlitchgrabFeedback(query: FeedbackQuery): {
  feedback: GlitchgrabFeedback[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { token, approvedOnly, userId, minRating, limit, baseUrl } = query;

  const [feedback, setFeedback] = useState<GlitchgrabFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const data = await fetchGlitchgrabFeedback({
        token,
        approvedOnly,
        userId,
        minRating,
        limit,
        baseUrl,
      });
      setFeedback(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [token, approvedOnly, userId, minRating, limit, baseUrl]);

  useEffect(() => {
    load();
  }, [load]);

  return { feedback, isLoading, isFetching, error, refetch: load };
}
