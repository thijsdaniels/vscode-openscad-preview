/**
 * Builds `src/webview/components/atoms/icons/fluentIcons.generated.ts` from
 * the Fluent UI System Icons package (MIT, Microsoft).
 *
 * - `colored`: Fluent "color" icons, copied as they are.
 * - `filled`: Fluent "filled" shapes, painted with a palette gradient and a
 *   gloss highlight so they match the colour icons.
 * - `codicons`: VS Code codicon shapes (MIT), painted the same way, where the
 *   familiar VS Code drawing reads better than the Fluent one.
 *
 * Also writes the standalone SVG files the manifest points to.
 *
 * Run with `npm run icons` after editing the tables below.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { drawnIcons } from "../src/webview/components/atoms/icons/drawnIcons";
import {
  iconPalette,
  type PaletteName,
} from "../src/webview/components/atoms/icons/iconPalette";

const colored: Record<string, string> = {
  camera: "camera",
  settings: "settings",
  globe: "globe",
  comment: "comment",
  add: "add_circle",
  warning: "warning",
  "auto-render": "arrow_sync",
  file: "document",
};

const filled: Record<string, { fluent: string; palette: PaletteName }> = {
  "tool-select": { fluent: "cursor", palette: "blue" },
  "tool-rotate": { fluent: "arrow_rotate_clockwise", palette: "orange" },
  "tool-scale": { fluent: "arrow_maximize", palette: "purple" },
  "panel-bottom": { fluent: "panel_bottom", palette: "blue" },
  "panel-side": { fluent: "panel_right", palette: "blue" },
  "save-as": { fluent: "save_copy", palette: "purple" },
  trash: { fluent: "delete", palette: "red" },
  discard: { fluent: "arrow_undo", palette: "orange" },
  active: { fluent: "flash", palette: "orange" },
  eye: { fluent: "eye", palette: "teal" },
  "eye-off": { fluent: "eye_off", palette: "grey" },
  scene: { fluent: "cube_tree", palette: "blue" },
  eraser: { fluent: "eraser", palette: "pink" },
  "clear-all": { fluent: "broom", palette: "orange" },
  "chevron-up": { fluent: "chevron_up", palette: "grey" },
  "chevron-down": { fluent: "chevron_down", palette: "grey" },
  info: { fluent: "info", palette: "blue" },
  error: { fluent: "error_circle", palette: "red" },
  folder: { fluent: "folder_open", palette: "orange" },
  font: { fluent: "text_font", palette: "purple" },
  accordion: { fluent: "list_bar_tree", palette: "blue" },
  "expand-all": { fluent: "arrow_expand_all", palette: "green" },
  "collapse-all": { fluent: "arrow_collapse_all", palette: "orange" },
};

const codicons: Record<string, { codicon: string; palette: PaletteName }> = {
  save: { codicon: "save", palette: "blue" },
};

const require = createRequire(import.meta.url);
const packageDir = (name: string) =>
  dirname(require.resolve(`${name}/package.json`));
const fluentDir = join(packageDir("@fluentui/svg-icons"), "icons");
const codiconDir = join(packageDir("@vscode/codicons"), "src", "icons");

type Shape = { inner: string; scale: number };

const innerMarkup = (file: string) =>
  file.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

/** Codicons are drawn on the 16px grid already. */
function readCodicon(name: string): Shape {
  const file = readFileSync(join(codiconDir, `${name}.svg`), "utf8");
  return { inner: innerMarkup(file), scale: 1 };
}

/** Reads the 16px variant, or the 20px one scaled down to the 16px grid. */
function readFluent(name: string, style: "color" | "filled"): Shape {
  for (const size of [16, 20]) {
    try {
      const file = readFileSync(
        join(fluentDir, `${name}_${size}_${style}.svg`),
        "utf8",
      );
      return { inner: innerMarkup(file), scale: 16 / size };
    } catch {
      // Size not available, try the next one.
    }
  }
  throw new Error(`Fluent icon not found: ${name} (${style})`);
}

function scaled(markup: string, scale: number) {
  return scale === 1 ? markup : `<g transform="scale(${scale})">${markup}</g>`;
}

function glossy({ inner, scale }: Shape, palette: PaletteName) {
  const [light, dark] = iconPalette[palette];
  const shapes = inner.replace(/\sfill="[^"]*"/g, "");
  const defs =
    `<defs>` +
    `<linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>` +
    `</linearGradient>` +
    `<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#fff" stop-opacity=".55"/>` +
    `<stop offset=".5" stop-color="#fff" stop-opacity="0"/>` +
    `</linearGradient>` +
    `</defs>`;
  return (
    defs +
    scaled(
      `<g fill="url(#fill)">${shapes}</g><g fill="url(#gloss)">${shapes}</g>`,
      scale,
    )
  );
}

const entries = [
  ...Object.entries(colored).map(([key, name]) => {
    const { inner, scale } = readFluent(name, "color");
    return [key, scaled(inner, scale)] as const;
  }),
  ...Object.entries(filled).map(
    ([key, { fluent, palette }]) =>
      [key, glossy(readFluent(fluent, "filled"), palette)] as const,
  ),
  ...Object.entries(codicons).map(
    ([key, { codicon, palette }]) =>
      [key, glossy(readCodicon(codicon), palette)] as const,
  ),
];

const output =
  `// Generated by scripts/generate-icons.ts — do not edit by hand.\n` +
  `// Shapes from Fluent UI System Icons and VS Code Codicons, © Microsoft Corporation, MIT licence.\n\n` +
  `export const fluentIcons = {\n` +
  entries
    .map(([key, markup]) => `  "${key}": ${JSON.stringify(markup)},\n`)
    .join("") +
  `} as const;\n`;

writeFileSync(
  join(
    import.meta.dirname,
    "../src/webview/components/atoms/icons/fluentIcons.generated.ts",
  ),
  output,
);

// Standalone SVG files for the manifest (editor title button, etc.).
const manifestIcons: Record<string, keyof typeof drawnIcons> = {
  "media/preview.svg": "render-solid",
};

for (const [file, name] of Object.entries(manifestIcons)) {
  writeFileSync(
    join(import.meta.dirname, "..", file),
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">${drawnIcons[name]}</svg>\n`,
  );
}

console.log(
  `${entries.length} icons and ${Object.keys(manifestIcons).length} manifest files written.`,
);
