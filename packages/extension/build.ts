import { build, context } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

const OUT = "dist";
const WATCH = process.argv.includes("--watch");

mkdirSync(`${OUT}/popup`, { recursive: true });
mkdirSync(`${OUT}/report`, { recursive: true });

const options = {
  entryPoints: {
    background: "src/background.ts",
    content: "src/content.ts",
    "popup/popup": "src/popup/popup.ts",
    "report/report": "src/report/report.tsx",
  },
  bundle: true,
  outdir: OUT,
  format: "esm" as const,
  target: "chrome120",
  minify: false,
  jsx: "automatic" as const,
  // React's DEV build uses new Function() for component stack traces — MV3's
  // default CSP blocks unsafe-eval, so it throws before anything renders
  // (blank report window, no visible error unless devtools is open). This
  // forces esbuild to resolve react/react-dom's PRODUCTION entry point,
  // which has no eval/Function-based code paths.
  define: { "process.env.NODE_ENV": '"production"' },
};

function copyStatic() {
  copyFileSync("src/manifest.json", `${OUT}/manifest.json`);
  copyFileSync("src/popup/popup.html", `${OUT}/popup/popup.html`);
  copyFileSync("src/popup/popup.css", `${OUT}/popup/popup.css`);
  copyFileSync("src/report/report.html", `${OUT}/report/report.html`);
  for (const s of [16, 32, 48, 128]) {
    copyFileSync(`src/icons/icon${s}.png`, `${OUT}/icon${s}.png`);
  }
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
