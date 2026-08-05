// Latest GlitchRecord desktop build, read straight from GitHub Releases.
//
// The desktop app is published by apps/glitchrecord's electron-builder
// (`publish` block in electron-builder.json5) — OWNER/REPO below must stay in
// sync with it, or /download will advertise a release nobody is shipping to.

const GLITCHRECORD_REPO = "Navibyte-Innovations-Pvt-Ltd/glitchrecord";
export const GLITCHRECORD_RELEASES_URL = `https://github.com/${GLITCHRECORD_REPO}/releases`;

export type DownloadPlatform =
  | "mac-arm64"
  | "mac-x64"
  | "windows-x64"
  | "linux-x64";

export interface DownloadAsset {
  platform: DownloadPlatform;
  label: string;
  /** Shown under the button, e.g. "Apple Silicon (M1–M4)". */
  hint: string;
  url: string;
  sizeBytes: number;
}

interface GlitchRecordRelease {
  version: string;
  publishedAt: string | null;
  notesUrl: string;
  assets: DownloadAsset[];
}

interface GhAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GhRelease {
  tag_name: string;
  published_at: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  assets: GhAsset[];
}

// Matched against electron-builder's artifactName templates:
//   mac   → ${productName}-${arch}.dmg        e.g. GlitchRecord-arm64.dmg
//   win   → ${productName}-windows-${arch}.exe
//   linux → ${productName}-linux-x64.AppImage
const MATCHERS: Array<{
  platform: DownloadPlatform;
  label: string;
  hint: string;
  test: (name: string) => boolean;
}> = [
  {
    platform: "mac-arm64",
    label: "Download for Mac",
    hint: "Apple Silicon (M1–M4)",
    test: (n) => n.endsWith(".dmg") && n.includes("arm64"),
  },
  {
    platform: "mac-x64",
    label: "Download for Mac",
    hint: "Intel",
    test: (n) => n.endsWith(".dmg") && n.includes("x64") && !n.includes("windows"),
  },
  {
    platform: "windows-x64",
    label: "Download for Windows",
    hint: "Windows 10 & 11",
    test: (n) => n.endsWith(".exe"),
  },
  {
    platform: "linux-x64",
    label: "Download for Linux",
    hint: "AppImage",
    test: (n) => n.endsWith(".AppImage"),
  },
];

/**
 * Returns null when there is no published release yet (or GitHub is
 * unreachable) — the page then falls back to a "builds coming soon" state
 * rather than rendering dead buttons.
 *
 * Unauthenticated GitHub API: 60 req/hr per IP. The 1-hour revalidate keeps
 * this to ~1 call per hour per edge region, well inside that.
 */
export async function getLatestGlitchRecordRelease(): Promise<GlitchRecordRelease | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GLITCHRECORD_REPO}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "glitchgrab.dev",
        },
        next: { revalidate: 3600 },
      }
    );
    // 404 is the normal "no releases published yet" answer, not an error.
    if (!res.ok) return null;

    const release = (await res.json()) as GhRelease;
    if (release.draft) return null;

    const assets: DownloadAsset[] = [];
    for (const matcher of MATCHERS) {
      const hit = release.assets.find((a) => matcher.test(a.name));
      if (!hit) continue;
      assets.push({
        platform: matcher.platform,
        label: matcher.label,
        hint: matcher.hint,
        url: hit.browser_download_url,
        sizeBytes: hit.size,
      });
    }
    if (assets.length === 0) return null;

    return {
      version: release.tag_name.replace(/^v/, ""),
      publishedAt: release.published_at,
      notesUrl: release.html_url,
      assets,
    };
  } catch {
    return null;
  }
}

export function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}
