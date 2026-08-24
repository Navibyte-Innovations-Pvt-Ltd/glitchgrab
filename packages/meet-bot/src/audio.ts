import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

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

/** Fallback sink from docker-entrypoint.sh, used when no per-job sink exists. */
const DEFAULT_SINK = "glitchgrab_sink";

/**
 * Create a sound card that belongs to ONE meeting.
 *
 * Every concurrent recording needs its own: PulseAudio mixes everything played
 * into a sink, so two calls sharing one would each capture both conversations.
 * That is a confidentiality failure, not a glitch — client A's recording would
 * contain client B's call.
 *
 * Returns the sink name, or the shared default if creation fails (a single
 * recording still works correctly on it).
 */
export async function createSink(meetingId: string): Promise<string> {
  // PulseAudio sink names allow a narrow character set; a cuid does not qualify.
  const name = `gg_${meetingId.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}`;
  try {
    await run("pactl", [
      "load-module",
      "module-null-sink",
      `sink_name=${name}`,
      `sink_properties=device.description=${name}`,
    ]);
    console.log(`[bot] created audio sink ${name}`);
    return name;
  } catch (err) {
    console.error(`[bot] could not create sink ${name}, falling back to shared:`, err);
    return DEFAULT_SINK;
  }
}

/** Tear the per-job sink down. Leaking these exhausts PulseAudio over time. */
export async function destroySink(sink: string): Promise<void> {
  if (!sink || sink === DEFAULT_SINK) return;
  try {
    // Unloading by module NAME would remove every null sink, including other
    // live recordings' — find this sink's own module id and unload only that.
    const { stdout } = await run("pactl", ["list", "short", "modules"]);
    for (const line of stdout.split("\n")) {
      if (line.includes(`sink_name=${sink}`)) {
        const id = line.split(/\s+/)[0];
        if (id) await run("pactl", ["unload-module", id]).catch(() => {});
      }
    }
  } catch {
    /* best effort — a stale sink costs memory, not correctness */
  }
}

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
export function startRecording(outPath: string, sink = DEFAULT_SINK): Recording {
  const ffmpeg: ChildProcess = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "pulse",
      "-i",
      `${sink}.monitor`,
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

/**
 * Peak amplitude (0–1) of what the sink is playing right now.
 *
 * The DOM checks that decide "is anyone still here" all fail *towards keeping
 * the recording* — a selector Google renames returns nothing, which is
 * indistinguishable from a full room. Audio is the one signal Meet cannot take
 * away from us: it comes off PulseAudio, not off the page. A call that has been
 * both unreadable and silent for a long time is over.
 *
 * Returns null if the probe itself fails — an unreadable level must never be
 * mistaken for silence.
 */
export async function sampleLevel(sink: string, ms = 2000): Promise<number | null> {
  return new Promise((resolve) => {
    const parec = spawn(
      "parec",
      [
        `--device=${sink || DEFAULT_SINK}.monitor`,
        "--format=s16le",
        "--rate=16000",
        "--channels=1",
      ],
      { stdio: ["ignore", "pipe", "ignore"] }
    );

    let peak = 0;
    let done = false;

    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      parec.kill("SIGKILL");
      resolve(value);
    };

    parec.stdout?.on("data", (chunk: Buffer) => {
      for (let i = 0; i + 1 < chunk.length; i += 2) {
        const sample = Math.abs(chunk.readInt16LE(i)) / 32768;
        if (sample > peak) peak = sample;
      }
    });

    parec.on("error", () => finish(null));

    const timer = setTimeout(() => finish(peak), ms);
  });
}
