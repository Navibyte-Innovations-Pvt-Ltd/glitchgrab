import { build, context } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = "dist";
const WATCH = process.argv.includes("--watch");

mkdirSync(`${OUT}/popup`, { recursive: true });

// @glitchgrab/report-ui is built with react/react-dom EXTERNAL (correct for
// its other consumer, the SDK, whose host app supplies its own React peer).
// Bundled here alongside the extension's OWN react import, esbuild resolves
// report-ui's unresolved "react" from the NEAREST node_modules —
// packages/report-ui/node_modules/react, a separate nested copy from the
// root one the extension's own code resolves — two live React instances in
// one bundle, which breaks hooks with "Cannot read properties of null
// (reading 'useState')". Pin both to the exact same file so there's only
// ever one.
const ROOT = path.resolve(__dirname, "../..");
const reactAlias = {
  react: path.resolve(ROOT, "node_modules/react"),
  "react-dom": path.resolve(ROOT, "node_modules/react-dom"),
  "react-dom/client": path.resolve(ROOT, "node_modules/react-dom/client"),
  "react/jsx-runtime": path.resolve(ROOT, "node_modules/react/jsx-runtime"),
};

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
  jsx: "automatic" as const,
  alias: reactAlias,
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
