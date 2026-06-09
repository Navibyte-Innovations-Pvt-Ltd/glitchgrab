import { context, build } from "esbuild";
import { mkdirSync, copyFileSync, cpSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const WATCH = process.argv.includes("--watch");
const RECORDLY_EXT_DIR = join(homedir(), "Library", "Application Support", "GlitchGrab", "extensions", "dev.glitchgrab.script-generator");

const STATIC = [
  { src: "recordly-extension.json", dest: "recordly-extension.json" },
];

function copyToGlitchGrab() {
  mkdirSync(RECORDLY_EXT_DIR, { recursive: true });
  // compiled JS
  copyFileSync("dist/index.js", join(RECORDLY_EXT_DIR, "index.js"));
  // static files
  for (const { src, dest } of STATIC) {
    copyFileSync(src, join(RECORDLY_EXT_DIR, dest));
  }
  console.log(`[GG] Copied → ${RECORDLY_EXT_DIR}`);
}

const esbuildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  format: "esm" as const,
  target: "chrome120",
  minify: false,
  plugins: [
    {
      name: "copy-on-build",
      setup(build: { onEnd: (cb: (result: { errors: unknown[] }) => void) => void }) {
        build.onEnd((result) => {
          if (result.errors.length === 0) copyToGlitchGrab();
        });
      },
    },
  ],
};

mkdirSync("dist", { recursive: true });

if (WATCH) {
  const ctx = await context(esbuildOptions);
  await ctx.watch();
  console.log("[GG] Watching for changes... (Ctrl+C to stop)");
  console.log(`[GG] Auto-copying to: ${RECORDLY_EXT_DIR}`);
  console.log("[GG] After each change: click ↻ in GlitchGrab Extensions panel to reload");
} else {
  await build(esbuildOptions);
}
