"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ContextRepo {
  id: string;
  fullName: string;
}

interface BookingPage {
  enabled: boolean;
  slotMinutes: number;
  bufferMinutes: number;
  timezone: string;
  workingHours: Record<string, [string, string][]> | null;
  title: string | null;
  description: string | null;
  horizonDays: number;
  noticeMinutes: number;
  whatsappCode: string | null;
}

const DAYS = [
  { key: "1", label: "Mon" },
  { key: "2", label: "Tue" },
  { key: "3", label: "Wed" },
  { key: "4", label: "Thu" },
  { key: "5", label: "Fri" },
  { key: "6", label: "Sat" },
  { key: "7", label: "Sun" },
];

/**
 * Demo booking settings for one project.
 *
 * Prospects book through the SDK dialog on the project's own site, or over
 * WhatsApp — both read the hours set here, and both write to the owner's Google
 * calendar. Nothing can be offered until a calendar is connected, so that is
 * said up front rather than discovered as "no slots available".
 */
export function BookingSettings() {
  const [repoId, setRepoId] = useState("");

  const { data: repos = [] } = useQuery<ContextRepo[]>({
    queryKey: ["project-context", "repos"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/project-context?repos=1");
      return data.data ?? [];
    },
  });

  const activeRepo = repoId || repos[0]?.id || "";

  const { data, isLoading } = useQuery({
    queryKey: ["booking-page", activeRepo],
    enabled: Boolean(activeRepo),
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/booking-page?repoId=${activeRepo}`);
      return data.data as {
        page: BookingPage | null;
        calendarConnected: boolean;
        calendarEmail: string | null;
        defaults: { workingHours: Record<string, [string, string][]>; slotMinutes: number; timezone: string };
      };
    },
  });

  if (repos.length === 0) return null;

  return (
    <div className="border border-border rounded p-4 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Demo booking</h2>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Prospects pick a slot from your real Google availability — in the booking dialog on your
        site, or over WhatsApp. Every demo booked here is recorded and transcribed automatically.
      </p>

      {repos.length > 1 && (
        <select
          value={activeRepo}
          onChange={(e) => setRepoId(e.target.value)}
          className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm"
        >
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fullName}
            </option>
          ))}
        </select>
      )}

      {isLoading || !data ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : (
        <BookingForm
          key={activeRepo}
          repoId={activeRepo}
          initial={
            data.page ?? {
              enabled: false,
              slotMinutes: data.defaults.slotMinutes,
              bufferMinutes: 0,
              timezone: data.defaults.timezone,
              workingHours: data.defaults.workingHours,
              title: null,
              description: null,
              horizonDays: 15,
              noticeMinutes: 120,
              whatsappCode: null,
            }
          }
          calendarConnected={data.calendarConnected}
        />
      )}
    </div>
  );
}

function BookingForm({
  repoId,
  initial,
  calendarConnected,
}: {
  repoId: string;
  initial: BookingPage;
  calendarConnected: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BookingPage>(initial);

  const save = useMutation({
    mutationFn: async () => {
      const { data: res } = await axios.put("/api/v1/booking-page", { repoId, ...form });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-page", repoId] });
      toast.success("Booking settings saved");
    },
    onError: (err) => {
      toast.error(
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not save"
      );
    },
  });

  const hours = form.workingHours ?? {};

  function setDay(key: string, enabled: boolean) {
    const next = { ...(form.workingHours ?? {}) };
    if (enabled) next[key] = next[key]?.length ? next[key] : [["09:00", "17:00"]];
    else delete next[key];
    setForm({ ...form, workingHours: next });
  }

  function setRange(key: string, index: 0 | 1, value: string) {
    const next = { ...(form.workingHours ?? {}) };
    const range = next[key]?.[0] ?? ["09:00", "17:00"];
    next[key] = [index === 0 ? [value, range[1]] : [range[0], value]];
    setForm({ ...form, workingHours: next });
  }

  return (
    <>

      {!calendarConnected && (
            <div className="text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded p-2 leading-relaxed">
              No Google Calendar connected. Booking cannot offer times until you connect one —
              connect it in Settings, then come back.
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Accept demo bookings for this project
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Num label="Slot length (min)" value={form.slotMinutes} onChange={(v) => setForm({ ...form, slotMinutes: v })} />
            <Num label="Gap between calls (min)" value={form.bufferMinutes} onChange={(v) => setForm({ ...form, bufferMinutes: v })} />
            <Num label="Book up to (days ahead)" value={form.horizonDays} onChange={(v) => setForm({ ...form, horizonDays: v })} />
            <Num label="Minimum notice (min)" value={form.noticeMinutes} onChange={(v) => setForm({ ...form, noticeMinutes: v })} />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Working hours ({form.timezone}) — slots are only offered inside these, and only when
              your calendar is actually free.
            </div>
            {DAYS.map((day) => {
              const range = hours[day.key]?.[0];
              return (
                <div key={day.key} className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1.5 w-16">
                    <input type="checkbox" checked={Boolean(range)} onChange={(e) => setDay(day.key, e.target.checked)} />
                    {day.label}
                  </label>
                  {range && (
                    <>
                      <input
                        type="time"
                        value={range[0]}
                        onChange={(e) => setRange(day.key, 0, e.target.value)}
                        className="bg-background border border-border rounded px-1.5 py-1"
                      />
                      <span className="text-muted-foreground">to</span>
                      <input
                        type="time"
                        value={range[1]}
                        onChange={(e) => setRange(day.key, 1, e.target.value)}
                        className="bg-background border border-border rounded px-1.5 py-1"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              WhatsApp code — appears in the &quot;Book on WhatsApp&quot; link so an incoming chat
              already knows which project it is about.
            </div>
            <input
              value={form.whatsappCode ?? ""}
              onChange={(e) => setForm({ ...form, whatsappCode: e.target.value })}
              placeholder="practicestack"
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm font-mono"
            />
          </div>

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 border border-border rounded px-3 py-1.5 text-xs hover:border-primary/40 disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {save.isPending ? "Saving…" : "Save booking settings"}
          </button>
    </>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full bg-background border border-border rounded px-2 py-1.5 text-sm text-foreground"
      />
    </label>
  );
}
