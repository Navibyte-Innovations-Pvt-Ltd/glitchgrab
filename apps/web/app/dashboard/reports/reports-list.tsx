"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
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

export function ReportsList({ isOwner }: { isOwner: boolean }) {
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const all = allReports ?? [];
  const my = myReports ?? [];

  if (all.length === 0 && my.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Reports will appear here when bugs are captured via the SDK or dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Product issues = all reports minus the ones in my reports (by ID)
  const myIds = new Set(my.map((r) => r.id));
  const productIssues = all.filter((r) => !myIds.has(r.id));

  return (
    <div className="relative">
      {isFetching && !isLoading && (
        <div className="absolute top-0 right-0">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <ReportsTabs
        myReports={my}
        productIssues={productIssues}
        isOwner={isOwner}
      />
    </div>
  );
}
