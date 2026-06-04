import { build, context } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

const OUT = "dist";
const WATCH = process.argv.includes("--watch");

mkdirSync(`${OUT}/popup`, { recursive: true });

const options = {
  entryPoints: {
    background: "src/background.ts",
    content: "src/content.ts",
    "popup/popup": "src/popup/popup.ts",
  },
  bundle: true,
  outdir: OUT,
  format: "esm" as const,
  target: "chrome120",
  minify: false,
};

function copyStatic() {
  copyFileSync("src/manifest.json", `${OUT}/manifest.json`);
  copyFileSync("src/popup/popup.html", `${OUT}/popup/popup.html`);
  copyFileSync("src/popup/popup.css", `${OUT}/popup/popup.css`);
}

if (WATCH) {
  const ctx = await context({
    ...options,
    plugins: [
      {
        name: "copy-static",
        setup(b) {
          b.onEnd((r) => {
            if (r.errors.length === 0) {
              copyStatic();
              console.log("[GG-ext] Rebuilt → dist (reload at chrome://extensions)");
            }
          });
        },
      },
    ],
  });
  await ctx.watch();
  console.log("[GG-ext] Watching for changes... (Ctrl+C to stop)");
} else {
  await build(options);
  copyStatic();
  console.log("Built to", OUT);
}
