import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const metadata: Metadata = {
  title: "Changelog — Glitchgrab",
  description: "See what's new in Glitchgrab — features, fixes, and improvements.",
  alternates: {
    canonical: "https://glitchgrab.dev/changelog",
  },
};

interface ChangelogEntry {
  version: string;
  date: string;
  sections: { heading: string; items: string[] }[];
}

function parseChangelog(raw: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  let currentSection: { heading: string; items: string[] } | null = null;

  for (const line of raw.split("\n")) {
    // Match version headers: ## [1.2.3](url) (2026-03-27) or ## 1.2.3 (2026-03-27)
    const versionMatch = line.match(
      /^## \[?(\d+\.\d+\.\d+)\]?(?:\([^)]*\))?\s*\((\d{4}-\d{2}-\d{2})\)/
    );
    if (versionMatch) {
      current = {
        version: versionMatch[1],
        date: versionMatch[2],
        sections: [],
      };
      entries.push(current);
      currentSection = null;
      continue;
    }

    // Match section headers: ### Bug Fixes, ### Features, etc.
    const sectionMatch = line.match(/^### (.+)/);
    if (sectionMatch && current) {
      currentSection = { heading: sectionMatch[1], items: [] };
      current.sections.push(currentSection);
      continue;
    }

    // Match list items: * **scope:** description or * description
    const itemMatch = line.match(/^\* (.+)/);
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1]);
    }
  }

  return entries;
}

export default async function ChangelogPage() {
  const changelogPath = join(process.cwd(), "../../CHANGELOG.md");
  let raw = "";
  try {
    raw = await readFile(changelogPath, "utf-8");
  } catch {
    // Fallback: try from project root directly (Vercel build)
    try {
      raw = await readFile(join(process.cwd(), "CHANGELOG.md"), "utf-8");
    } catch {
      raw = "";
    }
  }

  const entries = parseChangelog(raw);

  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Changelog
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          New features, fixes, and improvements shipped to Glitchgrab.
        </p>
      </header>

      {entries.length === 0 && (
        <div className="rounded-lg border border-border p-6 text-center">
          <p className="text-muted-foreground">
            No releases yet. Check back soon!
          </p>
        </div>
      )}

      <div className="space-y-10">
        {entries.map((entry) => (
          <section key={entry.version} className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-xl font-semibold">v{entry.version}</h2>
              <time className="text-sm text-muted-foreground">
                {new Date(entry.date + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </time>
            </div>

            {entry.sections.map((section) => (
              <div key={section.heading} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {section.heading}
                </h3>
                <ul className="space-y-1.5">
                  {section.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm text-muted-foreground leading-relaxed"
                    >
                      <span className="text-primary mt-1 shrink-0">•</span>
                      <span dangerouslySetInnerHTML={{
                        __html: item
                          .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground">$1</strong>')
                          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"),
                      }} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
