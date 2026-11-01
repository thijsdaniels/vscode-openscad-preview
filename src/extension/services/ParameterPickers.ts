import * as path from "path";
import { l10n, ProgressLocation, QuickPickItem, Uri, window } from "vscode";
import { StringParameter } from "../../shared/types/ScadParameter";
import { StringEditor } from "../../shared/types/StringEditor";
import { listSystemFonts } from "./SystemFonts";

/**
 * Opens a native box to choose a string parameter value. `baseDir` is the
 * folder of the .scad file: OpenSCAD resolves relative paths from there.
 * Resolves `undefined` when cancelled.
 */
type Picker = (
  param: StringParameter,
  current: string,
  baseDir: string,
) => Promise<string | undefined>;

/** Editors handled by the extension host; the others live in the webview. */
export const PARAMETER_PICKERS: Partial<Record<StringEditor, Picker>> = {
  file: (param, current, baseDir) =>
    pickPath(current, baseDir, false, param.extensions),
  folder: (_param, current, baseDir) => pickPath(current, baseDir, true),
  font: pickFont,
};

async function pickPath(
  current: string,
  baseDir: string,
  folders: boolean,
  extensions?: string[],
): Promise<string | undefined> {
  const filters: Record<string, string[]> = {};
  if (extensions?.length) {
    filters[l10n.t("Accepted files ({0})", extensions.join(", "))] = extensions;
  }
  filters[l10n.t("All files")] = ["*"];

  const uris = await window.showOpenDialog({
    defaultUri: Uri.file(path.resolve(baseDir, current || ".")),
    canSelectFiles: !folders,
    canSelectFolders: folders,
    canSelectMany: false,
    filters: folders ? undefined : filters,
  });
  if (!uris?.length) return undefined;

  // Relative to the .scad file when reachable, forward slashes for OpenSCAD.
  const chosen = uris[0].fsPath;
  const relative = path.relative(baseDir, chosen);
  const result = path.isAbsolute(relative) ? chosen : relative || ".";
  return result.split(path.sep).join("/");
}

/** Styles every font offers through OpenSCAD's `Family:style=…` syntax. */
const FONT_STYLES = ["Bold", "Italic", "Bold Italic"];

async function pickFont(
  _param: StringParameter,
  current: string,
): Promise<string | undefined> {
  const [currentFamily, currentStyle] = current.split(/:style=/i);
  const families = await window.withProgress(
    { location: ProgressLocation.Window, title: l10n.t("Listing fonts...") },
    () => listSystemFonts(),
  );

  if (!families.length) {
    return window.showInputBox({
      prompt: l10n.t(
        "Font name (OpenSCAD syntax, e.g. Liberation Sans:style=Bold)",
      ),
      value: current,
    });
  }

  const family = await window.showQuickPick(
    sortCurrentFirst(families, currentFamily).map(
      (name): QuickPickItem => ({
        label: name,
        description: name === currentFamily ? l10n.t("current") : undefined,
      }),
    ),
    { placeHolder: l10n.t("Font"), matchOnDescription: true },
  );
  if (!family) return undefined;

  const regular = l10n.t("Regular");
  const activeStyle = currentStyle ?? (current ? regular : undefined);
  const style = await window.showQuickPick(
    sortCurrentFirst([regular, ...FONT_STYLES], activeStyle).map(
      (name): QuickPickItem => ({
        label: name,
        description: name === activeStyle ? l10n.t("current") : undefined,
      }),
    ),
    { placeHolder: l10n.t("Style of {0}", family.label) },
  );
  if (!style) return undefined;

  return style.label === regular
    ? family.label
    : `${family.label}:style=${style.label}`;
}

function sortCurrentFirst(items: string[], current: string | undefined) {
  return current && items.includes(current)
    ? [current, ...items.filter((item) => item !== current)]
    : items;
}
