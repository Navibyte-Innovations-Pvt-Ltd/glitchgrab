"use client";

import { useEffect, useRef, useState } from "react";

// ─── Code rain with real error messages ───────────────────
const ERROR_FRAGMENTS = [
  "TypeError: Cannot read properties of undefined",
  "Unhandled Promise Rejection",
  "ReferenceError: x is not defined",
  "Error: ENOENT: no such file or directory",
  "SyntaxError: Unexpected token '<'",
  "ERR_CONNECTION_REFUSED",
  "500 Internal Server Error",
  "segfault at 0x0000",
  "FATAL ERROR: heap out of memory",
  "panic: runtime error: index out of range",
  "NullPointerException",
  "Stack overflow at line 42",
  "CORS policy: blocked",
  "WebSocket connection failed",
  "Maximum call stack size exceeded",
  "at Object.<anonymous> (index.js:1:1)",
  "at processTicksAndRejections",
  "throw new Error('something broke')",
  "console.error: Uncaught",
  "exit status 1",
  "build failed with 3 errors",
  "npm ERR! code ERESOLVE",
  "error TS2345: Argument of type",
  "SIGKILL: container exceeded memory",
  "429 Too Many Requests",
  "ECONNRESET: socket hang up",
];

interface Column {
  x: number;
  chars: { text: string; y: number; opacity: number; speed: number }[];
}

export function CodeRainBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const cols: Column[] = [];
    const colWidth = 180;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      cols.length = 0;
      const numCols = Math.ceil(canvas.width / colWidth) + 1;
      for (let i = 0; i < numCols; i++) {
        const x = i * colWidth + Math.random() * 40 - 20;
        const numChars = 2 + Math.floor(Math.random() * 3);
        const chars = [];
        for (let j = 0; j < numChars; j++) {
          chars.push({
            text: ERROR_FRAGMENTS[Math.floor(Math.random() * ERROR_FRAGMENTS.length)],
            y: Math.random() * canvas.height,
            opacity: 0.03 + Math.random() * 0.05,
            speed: 0.15 + Math.random() * 0.3,
          });
        }
        cols.push({ x, chars });
      }
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "11px 'JetBrains Mono', monospace";

      for (const col of cols) {
        for (const ch of col.chars) {
          ctx.globalAlpha = ch.opacity;
          ctx.fillStyle = "#22d3ee";
          ctx.fillText(ch.text, col.x, ch.y);
          ch.y += ch.speed;
          if (ch.y > canvas.height + 20) {
            ch.y = -20;
            ch.text = ERROR_FRAGMENTS[Math.floor(Math.random() * ERROR_FRAGMENTS.length)];
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
    />
  );
}

// ─── Animated terminal showing capture flow ───────────────
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

export function MiniTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    // Reset and replay
    const resetTimer = setTimeout(() => {
      setVisibleLines(0);
      const replayTimers: ReturnType<typeof setTimeout>[] = [];
      for (let i = 0; i < TERMINAL_LINES.length; i++) {
        replayTimers.push(
          setTimeout(() => {
            setVisibleLines(i + 1);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }, TERMINAL_LINES[i].delay)
        );
      }
      timers.push(...replayTimers);
    }, 8000);

    timers.push(resetTimer);
    return () => timers.forEach(clearTimeout);
  }, []);

  const colorMap: Record<string, string> = {
    muted: "text-muted-foreground/50",
    green: "text-green-400",
    red: "text-red-400",
    dim: "text-muted-foreground/30",
    cyan: "text-primary",
    link: "text-primary underline",
  };

  return (
    <div className="w-full rounded-xl border border-border/30 bg-black/40 backdrop-blur-sm overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 border-b border-border/20 px-3 py-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 text-[10px] text-muted-foreground/40 font-mono">terminal</span>
      </div>
      {/* Content */}
      <div
        ref={containerRef}
        className="p-3 h-45 sm:h-50 overflow-hidden font-mono text-[10px] sm:text-[11px] leading-[1.6] space-y-0.5"
      >
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className={`${colorMap[line.color]} animate-slide-up`}>
            {line.text || "\u00A0"}
          </div>
        ))}
        {/* Blinking cursor */}
        {visibleLines < TERMINAL_LINES.length && (
          <span className="inline-block w-1.5 h-3.5 bg-primary/60 animate-pulse" />
        )}
      </div>
    </div>
  );
}

// ─── Capture HUD ring ─────────────────────────────────────
export function HudRing() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="absolute -top-6 -right-6 h-32 w-32 opacity-[0.06] sm:h-40 sm:w-40">
      <circle cx="60" cy="60" r="56" stroke="#22d3ee" strokeWidth="0.5" />
      <circle cx="60" cy="60" r="48" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="4 8" />
      <circle cx="60" cy="60" r="40" stroke="#22d3ee" strokeWidth="0.5" />
      <circle
        cx="60"
        cy="60"
        r="56"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeDasharray="20 332"
        fill="none"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 60 60;360 60 60"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx="60"
        cy="60"
        r="40"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeDasharray="15 236"
        fill="none"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="360 60 60;0 60 60"
          dur="6s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Crosshair */}
      <line x1="60" y1="20" x2="60" y2="35" stroke="#22d3ee" strokeWidth="0.5" />
      <line x1="60" y1="85" x2="60" y2="100" stroke="#22d3ee" strokeWidth="0.5" />
      <line x1="20" y1="60" x2="35" y2="60" stroke="#22d3ee" strokeWidth="0.5" />
      <line x1="85" y1="60" x2="100" y2="60" stroke="#22d3ee" strokeWidth="0.5" />
    </svg>
  );
}

// ─── Stats counter ────────────────────────────────────────
export function AnimatedStat({ label, end, suffix = "" }: { label: string; end: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 2000;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.floor(eased * end));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [end]);

  return (
    <div className="text-center">
      <div className="text-lg font-bold text-primary font-mono">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}
