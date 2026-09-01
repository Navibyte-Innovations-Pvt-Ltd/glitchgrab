import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "playwright-core";

/**
 * Still frames from the call, taken WHILE it runs.
 *
 * There is no way to do this after the fact. Reading the transcript, deciding
 * "a screenshot of the attendance screen would help here" and then going to get
 * one is a sequence that cannot exist — the call is over, and nothing was kept
 * but audio. So the bot takes candidate frames on a cadence and the model picks
 * from what happened to be caught.
 *
 * The alternative — record the screen to video and cut frames out later — costs
 * gigabytes per call and an ffmpeg pass that cannot run on Vercel. This costs a
 * few megabytes and runs in the browser we already have open.
 *
 * Verified: headless Chromium DOES composite live WebRTC video into
 * `page.screenshot()`. Remote participant tiles and shared screens come out as
 * real pixels, not the black rectangles headless video capture is notorious for.
 */

/** How often to grab, before decimation kicks in. */
const BASE_INTERVAL_MS = 12_000;

/**
 * Ceiling on frames kept. A three-hour call at 12s would be 900 stills; past a
 * few hundred the extra frames are neither storage-free nor informative,
 * because the model only ever looks at a sample of them anyway.
 */
const MAX_FRAMES = 300;

/** JPEG quality. High enough to read a UI label, low enough to stay ~100-200KB. */
const JPEG_QUALITY = 55;

export interface Frame {
  /** Milliseconds since recording started — the same clock the transcript uses. */
  tMs: number;
  path: string;
  bytes: number;
}

export interface FrameCapture {
  stop: () => Frame[];
}

/**
 * Start grabbing frames until `stop()`.
 *
 * Failure here is always silent-by-design: a screenshot that throws (navigation
 * mid-capture, a page that went away, Meet repainting) must never end a
 * recording. Audio is the deliverable; frames are corroboration.
 */
export function startFrameCapture(page: Page, workDir: string, startedAt: number): FrameCapture {
  const frames: Frame[] = [];
  let intervalMs = BASE_INTERVAL_MS;
  let busy = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const shoot = async () => {
    // A screenshot of a busy page can take seconds. Overlapping calls queue up
    // inside Playwright and drift the whole cadence, so skip rather than stack.
    if (busy || stopped) return;
    busy = true;
    try {
      const tMs = Date.now() - startedAt;
      const buf = await page.screenshot({ type: "jpeg", quality: JPEG_QUALITY });
      const path = join(workDir, `frame-${String(tMs).padStart(9, "0")}.jpg`);
      await writeFile(path, buf);
      frames.push({ tMs, path, bytes: buf.length });

      // Halve the kept set and double the cadence rather than stopping. A long
      // call still ends up evenly covered instead of being fully captured for
      // its first hour and blind for the rest.
      //
      // The last frame is kept explicitly. Dropping every second one from a
      // set whose newest member sits at an odd index throws away the frame
      // taken a millisecond ago — the one most likely to show whatever is on
      // screen right now.
      if (frames.length >= MAX_FRAMES) {
        const thinned = frames.filter((_, i) => i % 2 === 0 || i === frames.length - 1);
        frames.length = 0;
        frames.push(...thinned);
        intervalMs *= 2;
        console.log(`[bot] frame cadence now ${intervalMs / 1000}s (${frames.length} kept)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[bot] frame capture skipped:", message);
    } finally {
      busy = false;
      if (!stopped) timer = setTimeout(() => void shoot(), intervalMs);
    }
  };

  // First frame immediately: the opening of a call is often the demo of the
  // thing that is broken, and waiting 12 seconds for frame one misses it.
  timer = setTimeout(() => void shoot(), 1_000);

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      return frames;
    },
  };
}
