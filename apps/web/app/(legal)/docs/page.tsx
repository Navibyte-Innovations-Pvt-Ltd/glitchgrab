import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const metadata: Metadata = {
  title: "Documentation — Glitchgrab",
  description:
    "Learn how to install, configure, and use the Glitchgrab SDK to turn bugs into GitHub issues.",
  alternates: {
    canonical: "https://glitchgrab.dev/docs",
  },
};

/* ------------------------------------------------------------------ */
/*  Tiny Markdown → JSX renderer (covers README patterns)             */
/* ------------------------------------------------------------------ */

interface Block {
  type:
    | "h2"
    | "h3"
    | "h4"
    | "p"
    | "code"
    | "table"
    | "ul"
    | "hr";
  content: string;
  lang?: string;
  rows?: string[][];
}

function parseReadme(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.split("\n");
  let i = 0;

  // Skip the first H1 (# glitchgrab) and the line after it
  if (lines[0]?.startsWith("# ")) {
    i = 1;
    // skip blank lines + the subtitle paragraph
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i < lines.length && !lines[i].startsWith("#") && !lines[i].startsWith("```")) {
      i++; // skip subtitle
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr", content: "" });
      i++;
      continue;
    }

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "code", content: codeLines.join("\n"), lang });
      continue;
    }

    // Table
    if (line.includes("|") && lines[i + 1]?.match(/^\|[-| ]+\|$/)) {
      const rows: string[][] = [];
      // header
      rows.push(
        line
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean)
      );
      i++; // skip separator
      i++;
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(
          lines[i]
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean)
        );
        i++;
      }
      blocks.push({ type: "table", content: "", rows });
      continue;
    }

    // Headings
    if (line.startsWith("#### ")) {
      blocks.push({ type: "h4", content: line.slice(5) });
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", content: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", content: line.slice(3) });
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      blocks.push({ type: "ul", content: items.join("\n") });
      continue;
    }

    // Blank line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — accumulate consecutive non-blank lines
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("- ") &&
      !lines[i].startsWith("* ") &&
      !lines[i].includes("|")
    ) {
      pLines.push(lines[i]);
      i++;
    }
    if (pLines.length > 0) {
      blocks.push({ type: "p", content: pLines.join(" ") });
    }
  }

  return blocks;
}

/** Inline markdown: **bold**, `code`, [link](url) */
function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-primary">$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary underline underline-offset-2 hover:text-primary/80">$1</a>'
    );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function DocsPage() {
  let raw = "";
  try {
    raw = await readFile(
      join(process.cwd(), "../../packages/sdk-nextjs/README.md"),
      "utf-8"
    );
  } catch {
    try {
      raw = await readFile(
        join(process.cwd(), "packages/sdk-nextjs/README.md"),
        "utf-8"
      );
    } catch {
      raw = "";
    }
  }

  const blocks = parseReadme(raw);

  // Build table of contents from h2s
  const toc = blocks
    .filter((b) => b.type === "h2")
    .map((b) => ({ label: b.content, slug: slugify(b.content) }));

  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Documentation
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you need to integrate Glitchgrab into your Next.js app.
        </p>
      </header>

      {/* Table of contents */}
      {toc.length > 0 && (
        <nav className="rounded-lg border border-border p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            On this page
          </h2>
          <ul className="space-y-1.5">
            {toc.map((item) => (
              <li key={item.slug}>
                <a
                  href={`#${item.slug}`}
                  className="text-sm text-muted-foreground hover:text-primary transition"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Content */}
      <div className="space-y-6">
        {blocks.map((block, i) => {
          switch (block.type) {
            case "hr":
              return <hr key={i} className="border-border" />;

            case "h2":
              return (
                <h2
                  key={i}
                  id={slugify(block.content)}
                  className="text-xl font-bold tracking-tight pt-6 first:pt-0 sm:text-2xl scroll-mt-24"
                >
                  {block.content}
                </h2>
              );

            case "h3":
              return (
                <h3
                  key={i}
                  id={slugify(block.content)}
                  className="text-lg font-semibold pt-4 sm:text-xl scroll-mt-24"
                >
                  {block.content}
                </h3>
              );

            case "h4":
              return (
                <h4
                  key={i}
                  className="text-base font-semibold pt-2"
                >
                  {block.content}
                </h4>
              );

            case "p":
              return (
                <p
                  key={i}
                  className="text-sm text-muted-foreground leading-relaxed sm:text-base"
                  dangerouslySetInnerHTML={{
                    __html: inlineMarkdown(block.content),
                  }}
                />
              );

            case "code":
              return (
                <div key={i} className="relative group">
                  {block.lang && (
                    <span className="absolute top-2 right-3 text-[10px] font-mono text-muted-foreground/50 uppercase">
                      {block.lang}
                    </span>
                  )}
                  <pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-[13px] leading-relaxed font-mono">
                    <code>{block.content}</code>
                  </pre>
                </div>
              );

            case "table":
              return (
                <div key={i} className="overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-muted/50">
                        {block.rows?.[0]?.map((cell, ci) => (
                          <th
                            key={ci}
                            className="text-left px-3 py-2 font-semibold text-foreground border-b border-border"
                            dangerouslySetInnerHTML={{
                              __html: inlineMarkdown(cell),
                            }}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows?.slice(1).map((row, ri) => (
                        <tr
                          key={ri}
                          className="border-b border-border last:border-0"
                        >
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className="px-3 py-2 text-muted-foreground"
                              dangerouslySetInnerHTML={{
                                __html: inlineMarkdown(cell),
                              }}
                            />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

            case "ul":
              return (
                <ul key={i} className="space-y-1.5 pl-1">
                  {block.content.split("\n").map((item, li) => (
                    <li
                      key={li}
                      className="flex gap-2 text-sm text-muted-foreground leading-relaxed"
                    >
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: inlineMarkdown(item),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              );

            default:
              return null;
          }
        })}
      </div>

      {/* Install CTA */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center sm:p-8">
        <p className="text-sm text-muted-foreground sm:text-base">
          Ready to get started?
        </p>
        <pre className="mt-3 inline-block rounded-lg bg-background border border-border px-4 py-2 font-mono text-sm text-primary">
          bun add glitchgrab
        </pre>
      </div>
    </article>
  );
}
