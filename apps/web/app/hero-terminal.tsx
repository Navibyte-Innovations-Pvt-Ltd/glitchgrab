"use client";

import { useEffect, useRef, useState } from "react";

const TERMINAL_LINES = [
  { text: "$ node server.js", color: "muted", delay: 0 },
  { text: "Server listening on :3000", color: "green", delay: 600 },
  { text: "", color: "muted", delay: 1000 },
  { text: "TypeError: Cannot read properties of undefined (reading 'id')", color: "red", delay: 1400 },
  { text: "    at /api/users/route.ts:24:18", color: "dim", delay: 1700 },
  { text: "    at processTicksAndRejections (node:internal/process)", color: "dim", delay: 1900 },
  { text: "", color: "muted", delay: 2200 },
  { text: "[glitchgrab] Error captured with 12 breadcrumbs", color: "cyan", delay: 2600 },
  { text: "[glitchgrab] Screenshot taken (1024x768)", color: "cyan", delay: 3000 },
  { text: "[glitchgrab] Checking for duplicates...", color: "cyan", delay: 3400 },
  { text: "[glitchgrab] New issue — pushing to GitHub", color: "cyan", delay: 3900 },
  { text: "", color: "muted", delay: 4200 },
  { text: "Created: TypeError in /api/users — reading 'id' of undefined #47", color: "green", delay: 4500 },
  { text: "Labels: bug, critical, api", color: "green", delay: 4800 },
  { text: "https://github.com/you/app/issues/47", color: "link", delay: 5100 },
];

const COLOR_MAP: Record<string, string> = {
  muted: "text-muted-foreground/50",
  green: "text-green-400",
  red: "text-red-400",
  dim: "text-muted-foreground/30",
  cyan: "text-primary",
  link: "text-primary underline",
};

export function HeroTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cycle, setCycle] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleLines(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < TERMINAL_LINES.length; i++) {
      timers.push(
        setTimeout(() => {
          setVisibleLines(i + 1);
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }
        }, TERMINAL_LINES[i].delay)
      );
    }

    // Restart after pause
    timers.push(
      setTimeout(() => {
        setCycle((c) => c + 1);
      }, 8000)
    );

    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="w-full max-w-lg rounded-xl border border-border/30 bg-black/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-primary/5">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 border-b border-border/20 px-4 py-2.5">
        <div className="h-3 w-3 rounded-full bg-red-500/60" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
        <div className="h-3 w-3 rounded-full bg-green-500/60" />
        <span className="ml-2 text-[11px] text-muted-foreground/40 font-mono">terminal</span>
      </div>
      {/* Content */}
      <div
        ref={containerRef}
        className="p-4 h-96 sm:h-120 overflow-hidden font-mono text-[11px] sm:text-xs leading-[1.7] space-y-0.5 text-left"
      >
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={`${cycle}-${i}`} className={`${COLOR_MAP[line.color]} animate-slide-up`}>
            {line.text || "\u00A0"}
          </div>
        ))}
        {visibleLines < TERMINAL_LINES.length && (
          <span className="inline-block w-1.75 h-3.75 bg-primary/60 animate-pulse" />
        )}
      </div>
    </div>
  );
}
