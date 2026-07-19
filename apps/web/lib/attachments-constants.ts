// Shared between client components and server routes — no Node-only APIs here.

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_ATTACHMENTS_PER_REPORT = 5;
const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
];
// Declared MIME types that indicate the payload is renderable/executable content
// (HTML, JS, SVG) rather than a document — reject regardless of filename extension.
const DANGEROUS_MIME_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "text/javascript",
  "application/javascript",
  "application/ecmascript",
  "image/svg+xml",
];

export function isAllowedDocumentFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (!ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext))) return false;
  if (file.type && DANGEROUS_MIME_TYPES.includes(file.type.toLowerCase())) return false;
  return true;
}
