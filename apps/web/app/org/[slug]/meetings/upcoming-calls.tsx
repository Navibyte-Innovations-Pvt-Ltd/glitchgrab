"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalendarData {
  connections: {
    id: string;
    googleEmail: string;
    autoRecord: boolean;
    defaultRepoId: string | null;
    lastSyncAt: string | null;
  }[];
  repos: { id: string; fullName: string }[];
  upcoming: {
    id: string;
    title: string | null;
    meetUrl: string;
    startsAt: string;
    repoId: string | null;
    repoFullName: string;
    status: "PENDING" | "DISPATCHED" | "SKIPPED" | "FAILED";
    meetingId: string | null;
    error: string | null;
  }[];
}

const STATUS_STYLE: Record<CalendarData["upcoming"][number]["status"], string> = {
  PENDING: "border-border text-muted-foreground",
  DISPATCHED: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  SKIPPED: "border-border text-muted-foreground/50",
  FAILED: "border-red-500/40 text-red-400 bg-red-500/10",
};

/**
 * Upcoming calls from Google Calendar (#311).
 *
 * The calendar IS the schedule — there is no separate booking system to keep in
 * sync. Assign a project to a call and the bot goes on its own.
 */
export function UpcomingCalls() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<CalendarData>({
    queryKey: ["calendar"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/calendar");
      return data.data;
    },
  });

  const sync = useMutation({
    mutationFn: async () => {
      await axios.get("/api/v1/calendar?sync=1");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Calendar refreshed");
    },
    onError: () => toast.error("Could not refresh the calendar"),
  });

  const update = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      await axios.patch("/api/v1/calendar", body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
    onError: (err) => {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not save";
      toast.error(message);
    },
  });

  if (isLoading) return null;

  // Not connected — offer it, don't nag.
  if (!data || data.connections.length === 0) {
    return (
      <div className="border border-border rounded p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-[11px] text-muted-foreground">
            Connect Google Calendar and booked demos record themselves.
          </span>
        </div>
        <a
          href="/api/v1/calendar/auth"
          className="font-mono text-[11px] px-3 py-2 rounded border border-primary/50 text-primary hover:bg-primary/10 shrink-0"
        >
          Connect calendar
        </a>
      </div>
    );
  }

  const connection = data.connections[0];

  return (
    <div className="border border-border rounded p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
            Upcoming calls
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/60 truncate">
            {connection.googleEmail}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              update.mutate({
                connectionId: connection.id,
                autoRecord: !connection.autoRecord,
              })
            }
            className={cn(
              "font-mono text-[10px] px-2 py-1 rounded border transition-colors",
              connection.autoRecord
                ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {connection.autoRecord ? "auto-record on" : "auto-record off"}
          </button>

          <button
            type="button"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 rounded border border-border hover:border-primary/40 disabled:opacity-50"
          >
            {sync.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            refresh
          </button>
        </div>
      </div>

      {!connection.autoRecord && (
        <p className="font-mono text-[10px] text-amber-500/80">
          Auto-record is off — no bot will be sent. Turn it on above.
        </p>
      )}

      {data.upcoming.length === 0 ? (
        <p className="font-mono text-[11px] text-muted-foreground/60">
          No upcoming calls with a Meet link in the next 24 hours.
        </p>
      ) : (
        <div className="space-y-2">
          {data.upcoming.map((call) => (
            <div
              key={call.id}
              className="flex flex-wrap items-center gap-2 justify-between border-t border-border/60 pt-2 first:border-0 first:pt-0"
            >
              <div className="min-w-0">
                <div className="text-xs text-foreground truncate">
                  {call.title || "Untitled call"}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground/70">
                  {new Date(call.startsAt).toLocaleString()}
                  {call.error && <span className="text-red-400"> · {call.error}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* A call with no project cannot be recorded — there is nowhere
                    to file it. The picker is the fix, so it's right here. */}
                <select
                  value={call.repoId ?? ""}
                  disabled={call.status === "DISPATCHED"}
                  onChange={(e) =>
                    update.mutate({ scheduledId: call.id, repoId: e.target.value || null })
                  }
                  className="font-mono text-[10px] px-2 py-1 rounded border border-border bg-background disabled:opacity-50"
                >
                  <option value="">no project</option>
                  {data.repos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName}
                    </option>
                  ))}
                </select>

                <span
                  className={cn(
                    "font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded border",
                    STATUS_STYLE[call.status]
                  )}
                >
                  {call.status.toLowerCase()}
                </span>

                {call.status === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => update.mutate({ scheduledId: call.id, status: "SKIPPED" })}
                    className="font-mono text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400"
                  >
                    skip
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
