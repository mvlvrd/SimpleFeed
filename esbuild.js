import * as esbuild from "esbuild";
import { cpSync, mkdirSync } from "fs";

const common = {
  bundle: true,
  sourcemap: true,
  target: "firefox128",
  format: "esm"
};

await esbuild.build({
  ...common,
  entryPoints: [
    "src/background.js",
    "src/popup/popup.js",
    "src/ui/content.js",
  ],
  outdir: "dist",
  outbase: "src",
});

// Copy static assets
mkdirSync("dist/icons", { recursive: true });
mkdirSync("dist/popup", { recursive: true });
mkdirSync("dist/ui", { recursive: true });

const assets = [
  "src/background.xhtml",
  "src/popup/settings.html",
  "src/popup/popup.css",
  "src/ui/content.css",
  "src/icons/rss.png"
];

assets.forEach((src) => cpSync(src, src.replace(/^src\//, "dist/")));
