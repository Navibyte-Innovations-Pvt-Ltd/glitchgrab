// Shared between client components and server routes — no Node-only APIs here.

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_ATTACHMENTS_PER_REPORT = 5;

/**
 * Text-like files. These are NEVER committed to the repo — their content is
 * embedded directly in the issue body inside a fenced code block, so a renderable
 * payload (HTML, JS, SVG) can never be served from the repo attachments branch.
 */
export const TEXT_INLINE_EXTENSIONS = [
  ".html",
  ".htm",
  ".txt",
  ".md",
  ".json",
  ".xml",
  ".log",
  ".yml",
  ".yaml",
  ".csv",
  ".har",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".css",
  ".scss",
  ".py",
  ".sh",
] as const;

/** Binary documents. Committed to the repo's attachments branch and linked. */
export const BINARY_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
] as const;

// Declared MIME types that indicate the payload is renderable/executable content
// (HTML, JS, SVG) rather than a document. Rejected on the *binary* path only —
// those files land in a repo branch. Text-like files with these types are fine
// because they are inlined as fenced text and never committed anywhere.
const DANGEROUS_MIME_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "text/javascript",
  "application/javascript",
  "application/ecmascript",
  "image/svg+xml",
];

function hasExtension(file: File, extensions: readonly string[]): boolean {
  const name = file.name.toLowerCase();
  return extensions.some((ext) => name.endsWith(ext));
}

/** `text/html;charset=utf-8` → `text/html`. Params break exact MIME matching. */
function baseMimeType(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

/** True when the file's content should be inlined into the issue body as text. */
export function isTextInlineFile(file: File): boolean {
  return hasExtension(file, TEXT_INLINE_EXTENSIONS);
}

/** True when the file should be committed to the repo attachments branch. */
export function isBinaryDocumentFile(file: File): boolean {
  if (!hasExtension(file, BINARY_DOCUMENT_EXTENSIONS)) return false;
  if (file.type && DANGEROUS_MIME_TYPES.includes(baseMimeType(file.type))) return false;
  return true;
}

export function isAllowedDocumentFile(file: File): boolean {
  return isTextInlineFile(file) || isBinaryDocumentFile(file);
}

/** `accept` value for document file inputs — mirrors the allowlists above. */
export const DOCUMENT_ACCEPT = [
  ...TEXT_INLINE_EXTENSIONS,
  ...BINARY_DOCUMENT_EXTENSIONS,
].join(",");
