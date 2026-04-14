"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Loader2, Send } from "lucide-react";
import Link from "next/link";

interface ReportDetail {
  id: string;
  source: string;
  status: string;
  rawInput: string | null;
  reporterPrimaryKey: string;
  reporterName: string;
  reporterEmail: string | null;
  createdAt: string;
  issue: {
    githubNumber: number;
    githubUrl: string;
    title: string;
    body: string;
    labels: string[];
    severity: string | null;
    githubState: string | null;
  } | null;
  comments: {
    author: string;
    body: string;
    createdAt: string;
  }[];
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: report, isLoading } = useQuery<ReportDetail>({
    queryKey: ["report-detail", id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/reports/${id}`);
      return data.data;
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (msg: string) => {
      const { data } = await axios.post(`/api/v1/reports/${id}/comments`, {
        message: msg,
      });
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["report-detail", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Report not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Back link */}
      <Link href="/dashboard/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-4 w-4" />
        Back to reports
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {report.issue?.title ?? report.rawInput?.slice(0, 80) ?? "Bug Report"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>by {report.reporterName}</span>
            {report.reporterEmail && <span>({report.reporterEmail})</span>}
            <span>
              {new Date(report.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {report.issue?.githubState && (
            <Badge variant={report.issue.githubState === "open" ? "default" : "secondary"}>
              {report.issue.githubState.toUpperCase()}
            </Badge>
          )}
          {report.issue?.githubUrl && (
            <a href={report.issue.githubUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                GitHub
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Labels */}
      {report.issue?.labels && report.issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {report.issue.labels.map((label) => (
            <Badge key={label} variant="outline" className="text-xs">{label}</Badge>
          ))}
        </div>
      )}

      {/* Issue body */}
      {report.issue?.body && (
        <Card>
          <CardContent className="p-4 sm:p-6 prose prose-sm prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {report.issue.body}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments thread */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          Comments ({report.comments.length})
        </h3>

        {report.comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}

        {report.comments.map((comment, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium">{comment.author}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                {comment.body}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reply input */}
      {report.issue?.githubState === "open" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim()) commentMutation.mutate(message.trim());
          }}
          className="flex gap-2"
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <Button
            type="submit"
            disabled={commentMutation.isPending || !message.trim()}
            className="shrink-0 self-end gap-1.5"
          >
            {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Reply
          </Button>
        </form>
      )}
    </div>
  );
}
