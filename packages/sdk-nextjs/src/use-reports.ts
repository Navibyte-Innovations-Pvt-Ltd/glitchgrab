"use client";

import { useState, useEffect, useCallback } from "react";

export interface GlitchgrabReport {
  id: string;
  source: string;
  status: string;
  rawInput: string | null;
  reporterPrimaryKey: string;
  reporterName: string;
  reporterEmail: string | null;
  reporterPhone: string | null;
  pageUrl: string | null;
  createdAt: string;
  /** Number of comments on the linked GitHub issue (0 if no issue) */
  commentCount: number;
  issue: {
    githubNumber: number;
    githubUrl: string;
    title: string;
    labels: string[];
    severity: string | null;
    githubState: string | null;
  } | null;
}

const BASE_URL = "https://www.glitchgrab.dev";

/**
 * Hook to fetch bug reports for a specific user.
 *
 * ```tsx
 * const { reports, isLoading, error, refetch } = useGlitchgrabReports({
 *   token: process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!,
 *   userId: session.user.id,
 * });
 * ```
 */
export function useGlitchgrabReports({
  token,
  userId,
  limit = 100,
}: {
  token: string;
  userId: string;
  /** Max results (default 100, max 100) */
  limit?: number;
}): {
  reports: GlitchgrabReport[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [reports, setReports] = useState<GlitchgrabReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!token || !userId) {
      setIsLoading(false);
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/sdk/reports?reporterPrimaryKey=${encodeURIComponent(userId)}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      if (data.success) {
        setReports(data.data ?? []);
      } else {
        setError(data.error ?? "Failed to fetch reports");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [token, userId, limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, isLoading, isFetching, error, refetch: fetchReports };
}

/**
 * Standalone fetcher — use with TanStack Query or any data fetching library.
 *
 * ```tsx
 * const { data } = useQuery({
 *   queryKey: ["glitchgrab-reports", userId],
 *   queryFn: () => fetchGlitchgrabReports({
 *     token: process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!,
 *     userId: session.user.id,
 *   }),
 * });
 * ```
 */
export async function fetchGlitchgrabReports({
  token,
  userId,
  limit = 100,
}: {
  token: string;
  userId: string;
  limit?: number;
}): Promise<GlitchgrabReport[]> {
  const res = await fetch(
    `${BASE_URL}/api/v1/sdk/reports?reporterPrimaryKey=${encodeURIComponent(userId)}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Failed to fetch reports");
  return data.data ?? [];
}

// ─── Report Actions ─────────────────────────────────────

async function reportAction(
  token: string,
  reportId: string,
  body: Record<string, string>
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/v1/reports/${reportId}/actions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error ?? "Action failed");
}

/**
 * Hook to manage report actions with loading/error states.
 *
 * ```tsx
 * const { approve, reject, close, isPending, error } = useGlitchgrabActions({
 *   token: process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN!,
 *   onSuccess: () => refetch(),
 *   onError: (err) => toast.error(err.message),
 * });
 *
 * <button onClick={() => approve(reportId)} disabled={isPending}>
 *   {isPending ? "..." : "Approve"}
 * </button>
 * ```
 */
export function useGlitchgrabActions({
  token,
  onSuccess,
  onError,
}: {
  token: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (reportId: string, body: Record<string, string>) => {
      setIsPending(true);
      setError(null);
      try {
        await reportAction(token, reportId, body);
        onSuccess?.();
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Action failed");
        setError(err.message);
        onError?.(err);
      } finally {
        setIsPending(false);
      }
    },
    [token, onSuccess, onError]
  );

  return {
    approve: (reportId: string) => run(reportId, { action: "label", label: "approved" }),
    reject: (reportId: string) => run(reportId, { action: "label", label: "rejected" }),
    close: (reportId: string) => run(reportId, { action: "close" }),
    reopen: (reportId: string) => run(reportId, { action: "reopen" }),
    label: (reportId: string, label: string) => run(reportId, { action: "label", label }),
    unlabel: (reportId: string, label: string) => run(reportId, { action: "unlabel", label }),
    isPending,
    error,
  };
}
