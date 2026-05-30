import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

const OUT = "dist";

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

copyFileSync("src/manifest.json", `${OUT}/manifest.json`);
copyFileSync("src/popup/popup.html", `${OUT}/popup/popup.html`);
copyFileSync("src/popup/popup.css", `${OUT}/popup/popup.css`);

console.log("Built to", OUT);
