"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Check, Copy, TriangleAlert } from "lucide-react";
import type { DownloadAsset, DownloadPlatform } from "@/lib/glitchrecord-release";
import { formatSize } from "@/lib/glitchrecord-release";

/**
 * Detects the visitor's platform so the page can lead with ONE button.
 *
 * Apple Silicon is the awkward case: Safari and Chrome both still report
 * "MacIntel" on M-series machines, so userAgent alone can't tell arm64 from
 * Intel. `navigator.maxTouchPoints > 0` on a Mac is the widely-used tell (M
 * chips expose touch capability, Intel Macs don't); a WebGL renderer probe
 * confirms it. Guessing wrong only costs the tester one click — the other
 * builds stay visible below.
 */
function detectPlatform(): DownloadPlatform | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;

  if (/Windows/i.test(ua)) return "windows-x64";
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "linux-x64";

  if (/Mac/i.test(ua)) {
    if (navigator.maxTouchPoints > 1) return "mac-arm64";
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      const renderer = ext
        ? String(gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : "";
      if (/Apple\s*M\d/i.test(renderer)) return "mac-arm64";
    } catch {
      /* probe unavailable — fall through to Intel */
    }
    return "mac-x64";
  }

  return null;
}

// Detection is read through useSyncExternalStore rather than an effect, so
// the server render (null) and the hydrated render can't disagree. getSnapshot
// must be referentially stable or React re-renders forever — hence the cache.
let cachedPlatform: DownloadPlatform | null | undefined;

function getClientPlatform(): DownloadPlatform | null {
  if (cachedPlatform === undefined) cachedPlatform = detectPlatform();
  return cachedPlatform;
}

const noopSubscribe = () => () => {};
const getServerPlatform = () => null;
const getClientMounted = () => true;
const getServerMounted = () => false;

const MAC_UNBLOCK_CMD = "xattr -cr /Applications/GlitchRecord.app";

function CopyCommand() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(MAC_UNBLOCK_CMD).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="group flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left font-mono text-xs text-foreground transition-colors hover:border-primary/50"
    >
      <span className="truncate">{MAC_UNBLOCK_CMD}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
      )}
    </button>
  );
}

export function DownloadPicker({
  assets,
  version,
}: {
  assets: DownloadAsset[];
  version: string;
}) {
  // The server can't know the visitor's OS, so the primary button only
  // resolves once we're on the client.
  const detected = useSyncExternalStore(
    noopSubscribe,
    getClientPlatform,
    getServerPlatform
  );
  const ready = useSyncExternalStore(noopSubscribe, getClientMounted, getServerMounted);

  const primary = assets.find((a) => a.platform === detected) ?? null;
  const others = assets.filter((a) => a.platform !== primary?.platform);
  const isMac = primary?.platform.startsWith("mac") ?? false;

  return (
    <div className="space-y-6">
      {/* Primary CTA */}
      {ready && primary ? (
        <div className="space-y-2">
          <a
            href={primary.url}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[0_0_24px_rgba(34,211,238,0.2)] transition-opacity hover:opacity-90"
          >
            <Download className="h-5 w-5" />
            {primary.label}
          </a>
          <p className="text-center font-mono text-xs text-muted-foreground">
            {primary.hint} · v{version} · {formatSize(primary.sizeBytes)}
          </p>
        </div>
      ) : (
        <div className="h-19 animate-pulse rounded-lg border border-border bg-muted/30" />
      )}

      {/* Unsigned-build step. Shown up front for Mac visitors rather than
          buried in a FAQ — without it the app looks broken on first launch
          ("GlitchRecord is damaged"), and a tester will just give up. */}
      {ready && isMac && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              One extra step on macOS
            </h3>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            GlitchRecord isn&apos;t notarized by Apple yet, so macOS will say it
            is <span className="text-foreground">&ldquo;damaged&rdquo;</span>.
            It isn&apos;t. After dragging the app to Applications, paste this
            into Terminal once:
          </p>
          <CopyCommand />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Then open GlitchRecord normally. You only ever do this once.
          </p>
        </div>
      )}

      {/* Every other build */}
      {ready && others.length > 0 && (
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Other platforms
          </div>
          <div className="divide-y divide-border rounded-lg border border-border">
            {others.map((a) => (
              <a
                key={a.platform}
                href={a.url}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
              >
                <span className="text-foreground">
                  {a.label.replace("Download for ", "")}
                  <span className="ml-2 text-xs text-muted-foreground">{a.hint}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatSize(a.sizeBytes)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
