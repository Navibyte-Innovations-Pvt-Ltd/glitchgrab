"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Pencil, Trash2, Undo2 } from "lucide-react";

type Point = { x: number; y: number };

type Stroke =
  | { type: "freehand"; color: string; width: number; points: Point[] }
  | { type: "circle"; color: string; width: number; cx: number; cy: number; r: number };

const PALETTE = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ffffff"];

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.type === "freehand") {
    if (s.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

interface AnnotationCanvasProps {
  imageSrc: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

/** Freehand + circle annotation overlay for a staged screenshot — draws on a canvas sized to the image's natural resolution, composited on save. */
export function AnnotationCanvas({ imageSrc, onSave, onCancel }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<"pen" | "circle">("pen");
  const [color, setColor] = useState(PALETTE[0]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      setReady(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const s of strokes) drawStroke(ctx, s);
    if (currentStroke) drawStroke(ctx, currentStroke);
  }, [ready, strokes, currentStroke]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
    setCurrentStroke(
      tool === "pen"
        ? { type: "freehand", color, width: strokeWidth, points: [{ x, y }] }
        : { type: "circle", color, width: strokeWidth, cx: x, cy: y, r: 0 },
    );
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;
    const { x, y } = getPos(e);
    setCurrentStroke((prev) => {
      if (!prev) return prev;
      if (prev.type === "freehand") return { ...prev, points: [...prev.points, { x, y }] };
      return { ...prev, r: Math.hypot(x - prev.cx, y - prev.cy) };
    });
  };

  const handlePointerUp = () => {
    setCurrentStroke((prev) => {
      if (prev) setStrokes((s) => [...s, prev]);
      return null;
    });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/jpeg", 0.85));
  };

  return (
    <div className="flex flex-col items-center gap-3 p-2">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="max-w-full max-h-[65vh] rounded-lg touch-none cursor-crosshair border border-border"
      />

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => setTool("pen")}
          title="Freehand"
          aria-label="Freehand tool"
          className={`h-8 w-8 flex items-center justify-center rounded border transition-colors ${
            tool === "pen"
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setTool("circle")}
          title="Circle"
          aria-label="Circle tool"
          className={`h-8 w-8 flex items-center justify-center rounded border transition-colors ${
            tool === "circle"
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Circle className="h-3.5 w-3.5" />
        </button>

        <div className="h-5 w-px bg-border mx-1" />

        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            className="h-5 w-5 rounded-full"
            style={{
              background: c,
              border: color === c ? "2px solid var(--primary)" : "2px solid rgba(127,127,127,0.4)",
            }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Custom color"
          aria-label="Custom color"
          className="h-5 w-5 border-0 bg-transparent cursor-pointer p-0"
        />

        <div className="h-5 w-px bg-border mx-1" />

        <input
          type="range"
          min={2}
          max={12}
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          title="Stroke width"
          aria-label="Stroke width"
          className="w-20"
        />

        <div className="h-5 w-px bg-border mx-1" />

        <button
          type="button"
          onClick={() => setStrokes((s) => s.slice(0, -1))}
          disabled={strokes.length === 0}
          title="Undo"
          aria-label="Undo"
          className="h-8 w-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-35"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setStrokes([])}
          disabled={strokes.length === 0}
          title="Clear all"
          aria-label="Clear all"
          className="h-8 w-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-35"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="font-mono text-xs px-3 py-1.5 rounded bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
        >
          Save annotation
        </button>
      </div>
    </div>
  );
}
