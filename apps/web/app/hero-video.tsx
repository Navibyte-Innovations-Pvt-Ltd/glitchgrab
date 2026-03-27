"use client";

import { useRef, useState } from "react";
import { Play, Volume2, VolumeX, Pause } from "lucide-react";

export function HeroVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  function togglePlay() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  function toggleMute() {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  return (
    <div className="relative mx-auto w-65 shrink-0 sm:w-70 lg:w-75">
      {/* Phone bezel */}
      <div className="rounded-[2.5rem] border-[1.5px] border-border/40 bg-[#1a1a1a] p-1.5 shadow-2xl shadow-primary/5">
        {/* Side button (right) */}
        <div className="absolute -right-0.5 top-22.5 h-10 w-0.75 rounded-r-sm bg-border/30" />
        {/* Volume buttons (left) */}
        <div className="absolute -left-0.5 top-17.5 h-4.5 w-0.75 rounded-l-sm bg-border/30" />
        <div className="absolute -left-0.5 top-24 h-7.5 w-0.75 rounded-l-sm bg-border/30" />
        <div className="absolute -left-0.5 top-33 h-7.5 w-0.75 rounded-l-sm bg-border/30" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[2.2rem] bg-black">
          {/* Status bar */}
          <div className="relative z-20 flex items-center justify-between px-6 pt-3 pb-1">
            {/* Time */}
            <span className="text-[10px] font-semibold text-white/90">9:41</span>
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2">
              <div className="h-5.5 w-20 rounded-full bg-black ring-1 ring-black" />
            </div>
            {/* Signal + WiFi + Battery */}
            <div className="flex items-center gap-1">
              {/* Signal bars */}
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className="text-white/90">
                <rect x="0" y="7" width="2.5" height="3" rx="0.5" fill="currentColor" />
                <rect x="3.5" y="5" width="2.5" height="5" rx="0.5" fill="currentColor" />
                <rect x="7" y="2.5" width="2.5" height="7.5" rx="0.5" fill="currentColor" />
                <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" fill="currentColor" />
              </svg>
              {/* WiFi */}
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="text-white/90">
                <path d="M6 9a0.8 0.8 0 1 1 0-1.6 0.8 0.8 0 0 1 0 1.6Z" fill="currentColor" />
                <path d="M3.8 6.5a3.2 3.2 0 0 1 4.4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                <path d="M1.6 4.2a6 6 0 0 1 8.8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </svg>
              {/* Battery */}
              <svg width="20" height="10" viewBox="0 0 20 10" fill="none" className="text-white/90">
                <rect x="0.5" y="1" width="16" height="8" rx="2" stroke="currentColor" strokeWidth="1" fill="none" />
                <rect x="2" y="2.5" width="12" height="5" rx="1" fill="currentColor" />
                <rect x="17" y="3.5" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
              </svg>
            </div>
          </div>

          {/* Video */}
          <video
            ref={ref}
            loop
            muted={muted}
            playsInline
            preload="metadata"
            className="aspect-9/19.5 w-full bg-black object-cover"
          >
            <source src={src} type="video/mp4" />
          </video>

          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 z-20 h-1 w-25 -translate-x-1/2 rounded-full bg-white/30" />

          {/* Play overlay — shown when paused */}
          {!playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 transition-opacity"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg shadow-primary/30">
                <Play className="h-6 w-6 text-black ml-1" fill="black" />
              </div>
            </button>
          )}

          {/* Bottom controls — shown when playing */}
          {playing && (
            <div className="absolute bottom-8 left-3 right-3 z-10 flex items-center justify-between">
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
              >
                <Pause className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={toggleMute}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
              >
                {muted ? (
                  <VolumeX className="h-4 w-4 text-white" />
                ) : (
                  <Volume2 className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Glow behind phone */}
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-primary/10 blur-3xl" />
    </div>
  );
}
