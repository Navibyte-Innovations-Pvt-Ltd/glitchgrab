"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ClipboardList, Loader2 } from "lucide-react";
import { ReportsTabs } from "./reports-tabs";

interface ReportItem {
  id: string;
  source: string;
  status: string;
  rawInput: string | null;
  failReason: string | null;
  createdAt: string;
  repoFullName: string;
  dismissed?: boolean;
  reporterPrimaryKey: string;
  reporterName: string;
  reporterEmail: string | null;
  issue: {
    githubNumber: number;
    githubUrl: string;
    title: string;
    githubState: string | null;
  } | null;
}

export function ReportsList({ orgSlug }: { orgSlug?: string } = {}) {
  // Fetch all reports via dashboard API (session auth)
  const { data: allReports, isLoading: loadingAll, isFetching } = useQuery<ReportItem[]>({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/reports");
      return data.data ?? [];
    },
  });

  // Fetch platform reports via SDK API (token auth) — "My Reports" tab
  const { data: myReports, isLoading: loadingMy } = useQuery<ReportItem[]>({
    queryKey: ["sdk-reports"],
    queryFn: async () => {
      const token = process.env.NEXT_PUBLIC_GLITCHGRAB_TOKEN;
      if (!token) return [];
      const { data } = await axios.get("/api/v1/sdk/reports?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (data.data ?? []).map((r: ReportItem) => ({
        ...r,
        failReason: null,
        repoFullName: r.repoFullName || "",
      }));
    },
  });

  const isLoading = loadingAll || loadingMy;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const all = allReports ?? [];
  const my = myReports ?? [];

  if (all.length === 0 && my.length === 0) {
    return (
      <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-mono text-sm text-foreground mb-2">
          no reports yet
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Reports will appear here when bugs are captured via the SDK or dashboard.
        </p>
      </div>
    );
  }

  // Product issues = all reports minus the ones in my reports (by ID)
  const myIds = new Set(my.map((r) => r.id));
  const productIssues = all.filter((r) => !myIds.has(r.id));

  return (
    <div className="relative">
      {isFetching && !isLoading && (
        <div className="absolute top-0 right-0">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      )}
      <ReportsTabs
        myReports={my}
        productIssues={productIssues}
        orgSlug={orgSlug}
      />
    </div>
  );
}
