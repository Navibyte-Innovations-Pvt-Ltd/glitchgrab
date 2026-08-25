"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CalendarClock, Check, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CalendarConnection {
  id: string;
  googleEmail: string;
  autoRecord: boolean;
  lastSyncAt: string | null;
}

/**
 * Connect the Google Calendar demos are booked into.
 *
 * Nothing about booking works without this — slots come from the owner's real
 * free/busy, and the demo itself is an event on this calendar. It lived only as
 * an API route until now, which meant the one prerequisite for the whole
 * feature had no way to be satisfied from the product.
 */
export function CalendarSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["calendar-connections"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/calendar");
      return data.data as { connections: CalendarConnection[] };
    },
  });

  const sync = useMutation({
    mutationFn: async () => {
      const { data } = await axios.get("/api/v1/calendar?sync=1");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      toast.success("Calendar synced");
    },
    onError: () => toast.error("Could not sync — try reconnecting"),
  });

  const connections = data?.connections ?? [];

  return (
    <section className="border border-border rounded-md">
      <div className="border-b border-border px-5 py-3 flex items-center gap-2">
        <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Google Calendar
        </h2>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Used for demo booking and call recording. Prospects are offered times you are actually
          free, the demo is created on this calendar with a Meet link, and the bot joins to record
          it.
        </p>

        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : connections.length === 0 ? (
          <a
            href="/api/v1/calendar/auth"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-mono text-xs px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Connect Google Calendar
          </a>
        ) : (
          <div className="space-y-3">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-border rounded px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm text-foreground flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    {c.googleEmail}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    {c.lastSyncAt
                      ? `last synced ${new Date(c.lastSyncAt).toLocaleString()}`
                      : "not synced yet"}
                    {c.autoRecord ? " · auto-record on" : ""}
                  </div>
                </div>
                <button
                  onClick={() => sync.mutate()}
                  disabled={sync.isPending}
                  className="inline-flex items-center gap-1.5 border border-border rounded px-2.5 py-1 font-mono text-[10px] hover:border-primary/40 disabled:opacity-60"
                >
                  {sync.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  sync now
                </button>
              </div>
            ))}

            {/* Reconnecting is the fix for a connection made before booking
                needed write access — and there is no way to tell which one you
                have from the outside, so the door stays open. */}
            <a
              href="/api/v1/calendar/auth"
              className="inline-block font-mono text-[10px] text-muted-foreground hover:text-foreground underline"
            >
              reconnect (needed once, to allow creating demo events)
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
