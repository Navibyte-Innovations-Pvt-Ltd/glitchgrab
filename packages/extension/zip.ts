import { $ } from "bun";
import { existsSync } from "node:fs";

/**
 * Package `dist/` for the Chrome Web Store.
 *
 * The store wants a zip whose **root** is the manifest — zipping the folder
 * itself produces `dist/manifest.json` inside the archive and the upload is
 * rejected with a message that does not mention nesting. Hence `cd dist`.
 */

const OUT = "glitchgrab-extension.zip";

if (!existsSync("dist/manifest.json")) {
  console.error("[zip] dist/manifest.json is missing — run `bun run build` first");
  process.exit(1);
}

await $`rm -f ${OUT}`.quiet();
// -r recurse, -q quiet, -X drop the macOS resource forks that otherwise ride
// along and count towards the package size.
await $`cd dist && zip -r -q -X ../${OUT} .`;

const size = Bun.file(OUT).size;
console.log(`[zip] ${OUT} — ${(size / 1024).toFixed(0)} KB`);
