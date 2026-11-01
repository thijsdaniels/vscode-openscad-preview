/**
 * Writes an HTML contact sheet of every icon (dark and light theme, 16px and
 * 48px) to the path given as argument. Run with `npx tsx scripts/icon-sheet.ts out.html`.
 */
import { writeFileSync } from "node:fs";
import { drawnIcons } from "../src/webview/components/atoms/icons/drawnIcons";
import { fluentIcons } from "../src/webview/components/atoms/icons/fluentIcons.generated";

const icons: Record<string, string> = { ...fluentIcons, ...drawnIcons };

// Each icon lives in its own shadow root in the extension; an <iframe>-free
// sheet needs unique gradient ids instead.
const isolate = (name: string, markup: string) =>
  markup
    .replace(/id="([^"]+)"/g, `id="${name}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${name}-$1)`);

const cell = (name: string, size: number, theme: string) =>
  `<figure><svg viewBox="0 0 16 16" width="${size}" height="${size}" fill="none">${isolate(
    `${theme}${size}-${name}`,
    icons[name],
  )}</svg><figcaption>${name}</figcaption></figure>`;

const panel = (theme: string, bg: string, fg: string) =>
  `<section style="background:${bg};color:${fg}">` +
  [48, 16]
    .map((size) =>
      Object.keys(icons)
        .map((n) => cell(n, size, theme))
        .join(""),
    )
    .join("<hr>") +
  `</section>`;

writeFileSync(
  process.argv[2],
  `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:10px sans-serif}
section{display:flex;flex-wrap:wrap;gap:6px;padding:10px}
hr{flex-basis:100%;border:0}
figure{margin:0;width:74px;display:flex;flex-direction:column;align-items:center;gap:3px}
svg{filter:drop-shadow(0 1px .6px rgb(0 0 0/.35))}
</style>${panel("d", "#1f1f1f", "#ccc")}${panel("l", "#ffffff", "#333")}`,
);
