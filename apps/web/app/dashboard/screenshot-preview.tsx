"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Screenshot viewer for the chat lightboxes.
 *
 * Screenshots exist so someone can read the UI text in them, and a fit-to-dialog
 * view of a 2560px capture makes that impossible (#302). Click toggles between
 * fit and 100% natural size; at 100% the image is drag-to-pan.
 */
export function ScreenshotPreview({
  src,
  alt = "Screenshot preview",
  children,
}: {
  src: string;
  alt?: string;
  /** Overlay content (e.g. the Annotate button) pinned to the top-right. */
  children?: React.ReactNode;
}) {
  const [zoomed, setZoomed] = useState(false);
  // Decided once at load: does the image hold more pixels than the fit view shows?
  const [canZoom, setCanZoom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const panRef = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const anchorRef = useRef<{ fx: number; fy: number } | null>(null);

  // Callers pass `key={src}` so a different screenshot mounts a fresh viewer —
  // that is what resets zoom, rather than an effect chasing the prop.

  // Centre the clicked point after zooming in.
  useEffect(() => {
    const el = scrollRef.current;
    if (!zoomed || !el) return;
    const { fx, fy } = anchorRef.current ?? { fx: 0.5, fy: 0.5 };
    el.scrollLeft = fx * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = fy * el.scrollHeight - el.clientHeight / 2;
  }, [zoomed]);

  // Lives on the scroll container, not the <img>: panning holds pointer capture
  // on the container and Chrome retargets the resulting click there too, so a
  // handler on the image would never fire while zoomed.
  const toggleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (panRef.current?.moved) return;
    if (!zoomed && !canZoom) return;
    const img = imgRef.current;
    if (!zoomed && img) {
      const rect = img.getBoundingClientRect();
      anchorRef.current = {
        fx: (e.clientX - rect.left) / rect.width,
        fy: (e.clientY - rect.top) / rect.height,
      };
    }
    setZoomed((z) => !z);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!zoomed || !el) return;
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const start = panRef.current;
    if (!el || !start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) start.moved = true;
    el.scrollLeft = start.left - dx;
    el.scrollTop = start.top - dy;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const moved = panRef.current?.moved ?? false;
    try {
      scrollRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    // Stay "moved" through the click that follows this pointerup.
    if (moved) {
      panRef.current = { x: 0, y: 0, left: 0, top: 0, moved: true };
      setTimeout(() => {
        panRef.current = null;
      }, 0);
    } else {
      panRef.current = null;
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={toggleZoom}
        className={
          zoomed
            ? "max-h-[80vh] overflow-auto rounded-lg cursor-grab touch-none"
            : ""
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={(e) => {
            // Measured in the fit view, so the comparison answers exactly
            // "is detail being hidden right now?".
            const rect = e.currentTarget.getBoundingClientRect();
            setCanZoom(
              e.currentTarget.naturalWidth > rect.width + 1 ||
                e.currentTarget.naturalHeight > rect.height + 1,
            );
          }}
          className={
            zoomed
              ? "block max-w-none cursor-zoom-out"
              : `w-full h-auto rounded-lg object-contain max-h-[80vh] ${
                  canZoom ? "cursor-zoom-in" : ""
                }`
          }
        />
      </div>
      {children}
      {canZoom ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {zoomed
            ? "Drag to pan · click image to fit"
            : "Click image to zoom to full size"}
        </p>
      ) : null}
    </div>
  );
}
