import { describe, expect, it } from "bun:test";
import {
  buildInlineAttachmentsSection,
  splitAttachments,
  MAX_INLINE_CHARS_PER_FILE,
} from "./attachments";
import {
  isAllowedDocumentFile,
  isTextInlineFile,
  isBinaryDocumentFile,
} from "./attachments-constants";

function textFile(name: string, content = "hello", type = "") {
  return new File([content], name, { type });
}

describe("attachment classification", () => {
  it("allows html files that were previously rejected", () => {
    const file = textFile("page.html", "<h1>hi</h1>", "text/html");
    expect(isAllowedDocumentFile(file)).toBe(true);
    expect(isTextInlineFile(file)).toBe(true);
    expect(isBinaryDocumentFile(file)).toBe(false);
  });

  it("keeps binary documents on the repo-commit path", () => {
    const file = textFile("spec.pdf", "%PDF-1.4", "application/pdf");
    expect(isBinaryDocumentFile(file)).toBe(true);
    expect(isTextInlineFile(file)).toBe(false);
  });

  it("rejects a binary extension carrying a renderable MIME type", () => {
    const file = textFile("evil.pdf", "<script>", "text/html");
    expect(isAllowedDocumentFile(file)).toBe(false);
  });

  it("rejects unknown extensions", () => {
    expect(isAllowedDocumentFile(textFile("thing.exe"))).toBe(false);
  });

  it("splits mixed uploads", () => {
    const { textFiles, binaryFiles } = splitAttachments([
      textFile("a.html"),
      textFile("b.pdf"),
      textFile("c.json"),
    ]);
    expect(textFiles.map((f) => f.name)).toEqual(["a.html", "c.json"]);
    expect(binaryFiles.map((f) => f.name)).toEqual(["b.pdf"]);
  });
});

describe("buildInlineAttachmentsSection", () => {
  it("returns empty string with no files", async () => {
    expect(await buildInlineAttachmentsSection([])).toBe("");
  });

  it("embeds html content in a fenced collapsible block", async () => {
    const body = await buildInlineAttachmentsSection([
      textFile("page.html", "<h1>broken</h1>", "text/html"),
    ]);
    expect(body).toContain("## Attached files");
    expect(body).toContain("<summary><b>page.html</b>");
    expect(body).toContain("```html\n<h1>broken</h1>\n```");
  });

  it("uses a longer fence when the content contains backticks", async () => {
    const body = await buildInlineAttachmentsSection([
      textFile("notes.md", "```js\nconsole.log(1)\n```"),
    ]);
    expect(body).toContain("````markdown");
  });

  it("truncates oversized files and says so", async () => {
    const content = "x".repeat(MAX_INLINE_CHARS_PER_FILE + 500);
    const body = await buildInlineAttachmentsSection([textFile("big.log", content)]);
    expect(body).toContain("Truncated");
    expect(body).not.toContain("x".repeat(MAX_INLINE_CHARS_PER_FILE + 1));
  });

  it("stops inlining once the total budget is spent", async () => {
    const big = "y".repeat(MAX_INLINE_CHARS_PER_FILE);
    const files = Array.from({ length: 4 }, (_, i) => textFile(`f${i}.log`, big));
    const body = await buildInlineAttachmentsSection(files);
    expect(body).toContain("issue body limit reached");
  });

  it("skips empty files", async () => {
    expect(await buildInlineAttachmentsSection([textFile("empty.txt", "")])).toBe("");
  });
});
