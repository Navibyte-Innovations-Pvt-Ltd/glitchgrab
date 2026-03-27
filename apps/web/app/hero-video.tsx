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
    <div className="relative mx-auto w-[260px] shrink-0 sm:w-[280px] lg:w-[300px]">
      {/* Phone bezel */}
      <div className="rounded-[2.5rem] border-[1.5px] border-border/40 bg-[#1a1a1a] p-[6px] shadow-2xl shadow-primary/5">
        {/* Dynamic Island */}
        <div className="absolute top-[10px] left-1/2 z-20 -translate-x-1/2">
          <div className="h-[14px] w-[72px] rounded-full bg-black" />
        </div>

        {/* Side button (right) */}
        <div className="absolute -right-[2px] top-[90px] h-[40px] w-[3px] rounded-r-sm bg-border/30" />
        {/* Volume buttons (left) */}
        <div className="absolute -left-[2px] top-[70px] h-[18px] w-[3px] rounded-l-sm bg-border/30" />
        <div className="absolute -left-[2px] top-[96px] h-[30px] w-[3px] rounded-l-sm bg-border/30" />
        <div className="absolute -left-[2px] top-[132px] h-[30px] w-[3px] rounded-l-sm bg-border/30" />

        {/* Screen */}
        <div className="relative overflow-hidden rounded-[2.2rem]">
          <video
            ref={ref}
            loop
            muted={muted}
            playsInline
            preload="metadata"
            className="aspect-[9/19.5] w-full bg-black object-cover"
          >
            <source src={src} type="video/mp4" />
          </video>

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
            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
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
