import { build, type BuildOptions, context } from "esbuild";

const commonConfig: BuildOptions = {
  logLevel: "info",
  minify: process.env.NODE_ENV === "production",
  sourcemap: process.env.NODE_ENV !== "production",
};

const extensionConfig: BuildOptions = {
  ...commonConfig,
  entryPoints: ["src/extension/index.ts"],
  bundle: true,
  outfile: "dist/extension.cjs",
  external: ["vscode", "fsevents"],
  platform: "node",
  format: "cjs",
};

const webviewConfig: BuildOptions = {
  ...commonConfig,
  entryPoints: ["src/webview/index.ts"],
  bundle: true,
  outfile: "dist/webview.js",
  platform: "browser",
  format: "esm",
  loader: {
    ".stl": "binary",
    ".glsl": "text",
  },
};

const watch = process.argv.includes("--watch");

if (watch) {
  Promise.all([
    context(extensionConfig).then(({ watch }) => watch()),
    context(webviewConfig).then(({ watch }) => watch()),
  ]);
} else {
  Promise.all([build(extensionConfig), build(webviewConfig)]);
}
