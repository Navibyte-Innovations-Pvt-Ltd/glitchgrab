"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { FlaskConical, Loader2 } from "lucide-react";

interface TesterActivity {
  testerName: string;
  testerEmail: string | null;
  workTimeMs: number;
  bugCount: number;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0 && minutes === 0) return "<1m";
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function TesterActivityList() {
  const { data, isLoading } = useQuery<TesterActivity[]>({
    queryKey: ["extension-tester-sessions"],
    queryFn: async () => {
      const { data } = await axios.get("/api/v1/extension/sessions");
      return data.data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const testers = data ?? [];

  if (testers.length === 0) {
    return (
      <div className="border border-dashed border-border rounded p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-mono text-sm text-foreground mb-2">no tester activity yet</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Have a tester paste a repo token into the Glitchgrab Chrome extension popup —
          their login time and filed bugs will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-xs text-muted-foreground font-mono uppercase">
              <th className="text-left px-4 py-2 font-medium">tester</th>
              <th className="text-left px-4 py-2 font-medium">work time</th>
              <th className="text-left px-4 py-2 font-medium">bugs filed</th>
            </tr>
          </thead>
          <tbody>
            {testers.map((t) => (
              <tr key={t.testerEmail ?? t.testerName} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{t.testerName}</div>
                  {t.testerEmail && (
                    <div className="text-xs text-muted-foreground">{t.testerEmail}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-foreground">{formatDuration(t.workTimeMs)}</td>
                <td className="px-4 py-3 font-mono text-foreground">{t.bugCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
