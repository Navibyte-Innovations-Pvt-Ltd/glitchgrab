// Build script — bundles Chrome extension src/ → dist-capture/
import { build } from "esbuild";
import { copyFileSync, mkdirSync, cpSync } from "fs";

const OUT = "dist-capture";

mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/popup`, { recursive: true });

await build({
  entryPoints: {
    background: "src/background.ts",
    content: "src/content.ts",
    "popup/popup": "src/popup/popup.ts",
  },
  bundle: true,
  outdir: OUT,
  format: "esm",
  target: "chrome120",
  minify: false,
});

// Copy static files
copyFileSync("src/manifest.json", `${OUT}/manifest.json`);
copyFileSync("src/popup/popup.html", `${OUT}/popup/popup.html`);
copyFileSync("src/popup/popup.css", `${OUT}/popup/popup.css`);

// Copy icons from existing dist if available
try {
  cpSync("dist/icons", `${OUT}/icons`, { recursive: true });
} catch {
  mkdirSync(`${OUT}/icons`, { recursive: true });
}

console.log("Built to", OUT);
