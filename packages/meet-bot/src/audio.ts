import { spawn, type ChildProcess } from "node:child_process";

/**
 * Audio capture for the Meet bot.
 *
 * A headless browser has no speakers, so there is nothing to "record" until we
 * give it a sound card. The container runs PulseAudio with a **null sink** — a
 * virtual output device that discards what it plays but exposes a `.monitor`
 * source carrying the exact same samples. Chromium plays the call into the
 * sink; ffmpeg records the monitor. That is the whole trick.
 *
 * This is why the bot cannot run on Vercel or any other function platform: it
 * needs a long-lived process, a sound server, and a real browser.
 */

/** Must match the sink created in docker-entrypoint.sh. */
const SINK_NAME = "glitchgrab_sink";

export interface Recording {
  /** Where the audio is being written. */
  path: string;
  /** Stop ffmpeg and resolve once the file is finalised. */
  stop: () => Promise<void>;
}

/**
 * Start recording everything the browser is playing.
 *
 * Opus in a WebM container: the same format the extension produces, which
 * means the server side needs no branch for bot vs extension recordings, and
 * Sarvam accepts it directly with no conversion step.
 */
export function startRecording(outPath: string): Recording {
  const ffmpeg: ChildProcess = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "pulse",
      "-i",
      `${SINK_NAME}.monitor`,
      "-ac",
      "1",
      // Sarvam is optimal at 16 kHz, and speech gains nothing above it.
      "-ar",
      "16000",
      "-c:a",
      "libopus",
      "-b:a",
      "48k",
      "-y",
      outPath,
    ],
    { stdio: ["pipe", "ignore", "pipe"] }
  );

  ffmpeg.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString().trim();
    if (text) console.error("[ffmpeg]", text);
  });

  const stop = () =>
    new Promise<void>((resolve) => {
      if (ffmpeg.exitCode !== null) return resolve();

      ffmpeg.once("close", () => resolve());
      // 'q' on stdin makes ffmpeg finalise the container properly. SIGKILL
      // would leave a WebM with no duration written — playable by some tools,
      // rejected by others, and unusable for timestamps.
      try {
        ffmpeg.stdin?.write("q");
        ffmpeg.stdin?.end();
      } catch {
        ffmpeg.kill("SIGTERM");
      }

      // Never hang the whole job on a stuck encoder.
      setTimeout(() => {
        if (ffmpeg.exitCode === null) ffmpeg.kill("SIGKILL");
        resolve();
      }, 10_000);
    });

  return { path: outPath, stop };
}
