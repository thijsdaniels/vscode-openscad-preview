import { StringEditor } from "../../shared/types/StringEditor";

/** Formats OpenSCAD can import(), offered by default by the file editor. */
const IMPORT_EXTENSIONS = [
  "stl",
  "off",
  "obj",
  "amf",
  "3mf",
  "dxf",
  "svg",
  "png",
  "dat",
  "csv",
  "json",
];

interface StringEditorRule {
  editor: StringEditor;
  /** Words accepted as trailing hint: `// [color]`, `// [file:svg,dxf]`. */
  hints: string[];
  /** Default value that betrays the editor (checked before names). */
  value?: RegExp;
  /** Variable name that betrays the editor. */
  name: RegExp;
  /** Default accepted extensions (file editor). */
  extensions?: string[];
}

const RULES: StringEditorRule[] = [
  {
    editor: "color",
    hints: ["color", "colour", "couleur"],
    value: /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    name: /colou?r|couleur/i,
  },
  {
    editor: "font",
    hints: ["font", "police"],
    name: /font|police/i,
  },
  {
    editor: "folder",
    hints: ["folder", "directory", "dossier", "repertoire", "répertoire"],
    name: /folder|directory|(^|_)dir(_|$)|dossier|r[ée]pertoire/i,
  },
  {
    editor: "file",
    hints: ["file", "fichier"],
    value: new RegExp(`\\.(${IMPORT_EXTENSIONS.join("|")})$`, "i"),
    name: /file|fichier|path|chemin/i,
    extensions: IMPORT_EXTENSIONS,
  },
];

export interface DetectedStringEditor {
  editor: StringEditor;
  extensions?: string[];
}

/**
 * Explicit hint written as trailing comment config (`[file:svg,dxf]`).
 * `undefined` when the config is not an editor hint (e.g. a choice list).
 */
export function editorFromHint(
  config: string,
): DetectedStringEditor | undefined {
  const [word, list] = config.split(/:(.*)/s).map((part) => part?.trim());
  const rule = RULES.find((r) => r.hints.includes(word.toLowerCase()));
  if (!rule) return undefined;

  const extensions = list
    ?.split(",")
    .map((ext) =>
      ext
        .trim()
        .replace(/^\*?\./, "")
        .toLowerCase(),
    )
    .filter(Boolean);
  return {
    editor: rule.editor,
    extensions: extensions?.length ? extensions : rule.extensions,
  };
}

/** Guess from the default value first, then from the variable name. */
export function editorFromDeclaration(
  name: string,
  value: string,
): DetectedStringEditor | undefined {
  const rule =
    RULES.find((r) => r.value?.test(value)) ??
    RULES.find((r) => r.name.test(name));
  return rule && { editor: rule.editor, extensions: rule.extensions };
}
