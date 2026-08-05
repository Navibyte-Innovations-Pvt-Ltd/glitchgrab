import { commitFileToRepo } from "@/lib/github";
import { isTextInlineFile } from "@/lib/attachments-constants";

interface CommittedDocument {
  filename: string;
  url: string;
}

/** Max characters of a single text attachment embedded in the issue body. */
export const MAX_INLINE_CHARS_PER_FILE = 20_000;
/** Combined budget for all inlined attachments (GitHub caps issue bodies at 65,536). */
const MAX_INLINE_CHARS_TOTAL = 40_000;

/** Splits validated attachments into the inline-text set and the repo-commit set. */
export function splitAttachments(files: File[]): {
  textFiles: File[];
  binaryFiles: File[];
} {
  const textFiles: File[] = [];
  const binaryFiles: File[] = [];
  for (const file of files) {
    if (isTextInlineFile(file)) textFiles.push(file);
    else binaryFiles.push(file);
  }
  return { textFiles, binaryFiles };
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  html: "html",
  htm: "html",
  xml: "xml",
  json: "json",
  har: "json",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  csv: "csv",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  css: "css",
  scss: "scss",
  py: "python",
  sh: "bash",
  log: "text",
  txt: "text",
};

function languageFor(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return LANGUAGE_BY_EXTENSION[ext] ?? "text";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Picks a fence longer than the longest backtick run in the content so file
 * contents that themselves contain ``` can't break out of the code block.
 */
function fenceFor(content: string): string {
  let longest = 0;
  for (const match of content.matchAll(/`+/g)) {
    longest = Math.max(longest, match[0].length);
  }
  return "`".repeat(Math.max(3, longest + 1));
}

/**
 * Embeds text attachments directly in the issue body inside collapsible fenced
 * blocks. Nothing is written to the repo — the content lives in the issue only.
 */
export async function buildInlineAttachmentsSection(files: File[]): Promise<string> {
  if (files.length === 0) return "";

  const blocks: string[] = [];
  let budget = MAX_INLINE_CHARS_TOTAL;

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (budget <= 0) {
      blocks.push(`- \`${file.name}\` (${formatSize(file.size)}) — omitted, issue body limit reached`);
      continue;
    }

    let content: string;
    try {
      content = await file.text();
    } catch {
      continue;
    }

    const limit = Math.min(MAX_INLINE_CHARS_PER_FILE, budget);
    const truncated = content.length > limit;
    const shown = truncated ? content.slice(0, limit) : content;
    budget -= shown.length;

    const fence = fenceFor(shown);
    const note = truncated
      ? `\n\n> Truncated — showing first ${limit.toLocaleString()} of ${content.length.toLocaleString()} characters.`
      : "";

    blocks.push(
      `<details>\n<summary><b>${file.name}</b> · ${formatSize(file.size)}</summary>${note}\n\n` +
        `${fence}${languageFor(file.name)}\n${shown}\n${fence}\n\n</details>`
    );
  }

  if (blocks.length === 0) return "";
  return `\n\n## Attached files\n\n${blocks.join("\n\n")}`;
}

/** Commits validated binary document files to the target repo's attachments branch. */
export async function uploadDocumentsToRepo(
  accessToken: string,
  owner: string,
  repo: string,
  reportId: string,
  files: File[]
): Promise<CommittedDocument[]> {
  const results: CommittedDocument[] = [];

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `reports/${reportId}/${safeName}`;

    const committed = await commitFileToRepo(
      accessToken,
      owner,
      repo,
      path,
      base64,
      `Add attachment for report ${reportId}: ${safeName}`
    );
    if (committed) results.push({ filename: safeName, url: committed.url });
  }

  return results;
}

export function buildAttachmentsSection(docs: CommittedDocument[]): string {
  if (docs.length === 0) return "";
  const items = docs.map((d) => `- [${d.filename}](${d.url})`).join("\n");
  return `\n\n## Attachments\n\n${items}`;
}
