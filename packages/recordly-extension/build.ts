import { build } from "esbuild";
import { mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  format: "esm",
  target: "chrome120",
  minify: false,
  external: [],
});

console.log("Built dist/index.js");
