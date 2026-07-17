import { commitFileToRepo } from "@/lib/github";

export interface CommittedDocument {
  filename: string;
  url: string;
}

/** Commits validated document files to the target repo's attachments branch. */
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
