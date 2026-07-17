// Shared between client components and server routes — no Node-only APIs here.

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx"];

export function isAllowedDocumentFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext));
}
