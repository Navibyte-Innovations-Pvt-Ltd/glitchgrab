"use client";

import { useState, useEffect, useCallback } from "react";

interface GlitchgrabReport {
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
}: {
  token: string;
  userId: string;
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
        `${BASE_URL}/api/v1/sdk/reports?reporterPrimaryKey=${encodeURIComponent(userId)}&limit=100`,
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
  }, [token, userId]);

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
}: {
  token: string;
  userId: string;
}): Promise<GlitchgrabReport[]> {
  const res = await fetch(
    `${BASE_URL}/api/v1/sdk/reports?reporterPrimaryKey=${encodeURIComponent(userId)}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Failed to fetch reports");
  return data.data ?? [];
}
