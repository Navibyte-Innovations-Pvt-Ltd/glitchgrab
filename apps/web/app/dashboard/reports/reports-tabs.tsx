"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, ExternalLink, Bug, GitFork } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportItem {
  id: string;
  source: string;
  status: string;
  rawInput: string | null;
  failReason: string | null;
  createdAt: string;
  repoFullName: string;
  issue: {
    githubNumber: number;
    githubUrl: string;
    title: string;
    githubState: string | null;
  } | null;
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  PROCESSING: "secondary",
  CREATED: "default",
  DUPLICATE: "secondary",
  FAILED: "destructive",
};

const SOURCE_LABELS: Record<string, string> = {
  SDK_AUTO: "Auto Capture",
  SDK_USER_REPORT: "User Report",
  DASHBOARD_UPLOAD: "Dashboard",
  HANDWRITTEN_NOTE: "Handwritten",
  MCP: "MCP",
};

export function ReportsTabs({
  myReports,
  productIssues,
}: {
  myReports: ReportItem[];
  productIssues: ReportItem[];
}) {
  const [tab, setTab] = useState<"product" | "my">("product");

  const reports = tab === "product" ? productIssues : myReports;

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setTab("product")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
            tab === "product"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GitFork className="h-4 w-4" />
          Product Issues
          {productIssues.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {productIssues.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("my")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
            tab === "my"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bug className="h-4 w-4" />
          My Reports
          {myReports.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {myReports.length}
            </span>
          )}
        </button>
      </div>

      {/* Report list */}
      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {tab === "product" ? "No product issues yet" : "No bug reports yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {tab === "product"
                ? "Issues will appear here when bugs are captured via the SDK or dashboard."
                : "Bugs you report about Glitchgrab using the Report Bug button will show here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {report.issue ? (
                      <a
                        href={report.issue.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline flex items-center gap-1.5 min-w-0"
                      >
                        <span className="truncate">{report.issue.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </a>
                    ) : (
                      <p className="text-sm font-medium truncate">
                        {report.rawInput?.slice(0, 100) || report.failReason || "No description"}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">{report.repoFullName}</span>
                      {report.issue && (
                        <span className="text-xs text-muted-foreground">#{report.issue.githubNumber}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {SOURCE_LABELS[report.source] ?? report.source}
                    </Badge>
                    {report.issue ? (
                      <Badge
                        variant={
                          report.issue.githubState === "closed" ? "secondary"
                            : report.issue.githubState === "open" ? "default"
                            : "destructive"
                        }
                        className={cn(
                          "text-[10px]",
                          report.issue.githubState === "closed" && "opacity-60",
                          !report.issue.githubState && "opacity-60"
                        )}
                      >
                        {report.issue.githubState === "closed" ? "CLOSED"
                          : report.issue.githubState === "open" ? "OPEN"
                          : "DELETED"}
                      </Badge>
                    ) : (
                      <Badge
                        variant={report.status === "CREATED" ? "secondary" : (STATUS_COLORS[report.status] ?? "outline")}
                        className={cn("text-[10px]", report.status === "CREATED" && "opacity-60")}
                      >
                        {report.status === "CREATED" ? "NO ISSUE" : report.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
