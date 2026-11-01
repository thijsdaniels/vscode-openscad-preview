import {
  NumericParameter,
  ParameterOption,
  ScadParameter,
  StringParameter,
} from "../../shared/types/ScadParameter";
import { editorFromDeclaration, editorFromHint } from "./StringEditorRules";

/** Group names (lower case) whose parameters are hidden from the Customizer. */
const HIDDEN_GROUPS = new Set(["hidden", "masqué", "masque"]);

/**
 * Parses SCAD files to extract relevant information from them.
 */
export class ScadParser {
  public readonly parameters: ScadParameter[];

  constructor(content: string) {
    this.parameters = this.extractParameters(content);
  }

  private extractParameters(content: string): ScadParameter[] {
    const params: ScadParameter[] = [];
    let currentGroup = "";
    let moduleDepth = 0;
    // Customizer convention: a `// text` line right above a declaration is
    // its description. Any other line in between breaks the link.
    let commentAbove: string | undefined;

    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();

      // Remember plain comments as a possible description, skip empty lines
      if (!trimmed || (trimmed.startsWith("//") && !trimmed.includes("/*"))) {
        commentAbove = trimmed
          ? trimmed.substring(2).trim() || undefined
          : undefined;
        continue;
      }

      const description = commentAbove;
      commentAbove = undefined;

      // Track module scope using brace counting
      if (trimmed.startsWith("module")) {
        moduleDepth++;
      }
      moduleDepth += (trimmed.match(/\{/g) || []).length;
      moduleDepth -= (trimmed.match(/\}/g) || []).length;

      if (moduleDepth > 0) continue;

      // Check for parameter group comments
      if (trimmed.startsWith("/*")) {
        const group = this.extractParameterGroup(trimmed);
        if (group !== null) {
          currentGroup = group;
        }
        continue;
      }

      // Look for variable declarations
      const decl = this.parseVariableDeclaration(trimmed);
      if (!decl) continue;

      if (HIDDEN_GROUPS.has(currentGroup.trim().toLowerCase())) continue;

      const parsedVal = this.parseVariableValue(decl.valueStr);

      // Expression-valued variables (not literal booleans, numbers, or quoted
      // strings) are computed by OpenSCAD from the file — skip them here so
      // they are never overridden via -D with a wrong string value.
      if (!parsedVal) continue;

      // We construct the object in a type-safe way before applying to partial
      const param: Partial<ScadParameter> = {
        name: decl.name,
        type: parsedVal.type,
        group: currentGroup || undefined,
        value: parsedVal.value,
      } as Partial<ScadParameter>;

      if (decl.commentStr) {
        this.parseTrailingComment(decl.commentStr, param);
      }

      // The comment above wins over a trailing description.
      if (description) param.description = description;

      // No hint and no choice list: guess the editor from value or name.
      if (param.type === "string") {
        const strParam = param as Partial<StringParameter>;
        if (!strParam.editor && !strParam.options) {
          Object.assign(
            strParam,
            editorFromDeclaration(decl.name, String(parsedVal.value)),
          );
        }
      }

      params.push(param as ScadParameter);
    }

    return params;
  }

  private extractParameterGroup(line: string): string | null {
    const groupMatch = line.match(/\/\*\s*\[(.*?)\]\s*\*\//);
    return groupMatch ? groupMatch[1] : null;
  }

  private parseVariableDeclaration(
    line: string,
  ): { name: string; valueStr: string; commentStr: string } | null {
    const varMatch = line.match(/^(\w+)\s*=\s*(.+?);(.*)/);
    if (varMatch) {
      return {
        name: varMatch[1],
        valueStr: varMatch[2],
        commentStr: varMatch[3],
      };
    }
    return null;
  }

  private parseVariableValue(valueStr: string): {
    type: "number" | "boolean" | "string";
    value: string | number | boolean;
  } | null {
    const trimmed = valueStr.trim();

    if (trimmed === "true" || trimmed === "false") {
      return { type: "boolean", value: trimmed === "true" };
    }

    if (trimmed !== "" && !isNaN(Number(trimmed))) {
      return { type: "number", value: Number(trimmed) };
    }

    // Only accept explicitly quoted string literals. Bare expressions
    // (arithmetic, function calls, vectors, variable references) return null
    // so the caller can skip them — OpenSCAD computes those itself.
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return { type: "string", value: trimmed.slice(1, -1) };
    }

    return null;
  }

  private parseChoices(
    configStr: string,
    type: "number" | "string",
  ): ParameterOption<number | string>[] {
    const options: ParameterOption<number | string>[] = [];
    const parts = configStr.split(",").map((p) => p.trim());

    for (const part of parts) {
      if (!part) continue;

      let valStr = part;
      let label: string | undefined = undefined;

      const colonIdx = part.indexOf(":");
      if (colonIdx !== -1) {
        valStr = part.substring(0, colonIdx).trim();
        label = part.substring(colonIdx + 1).trim();
      }

      if (type === "number") {
        const val = Number(valStr);
        if (!isNaN(val)) {
          options.push({ value: val, label });
        }
      } else {
        const val = valStr.replace(/^["']|["']$/g, "");
        options.push({ value: val, label });
      }
    }
    return options;
  }

  private parseRange(
    configStr: string,
  ): { min: number; max: number; step?: number } | null {
    const rangeStepMatch = configStr.match(
      /^(-?[\d.]+)\s*:\s*(-?[\d.]+)\s*:\s*(-?[\d.]+)$/,
    );
    if (rangeStepMatch) {
      return {
        min: Number(rangeStepMatch[1]),
        step: Number(rangeStepMatch[2]),
        max: Number(rangeStepMatch[3]),
      };
    }

    const rangeMatch = configStr.match(/^(-?[\d.]+)\s*:\s*(-?[\d.]+)$/);
    if (rangeMatch) {
      return {
        min: Number(rangeMatch[1]),
        max: Number(rangeMatch[2]),
      };
    }

    return null;
  }

  private parseTrailingComment(
    commentStr: string,
    param: Partial<ScadParameter>,
  ): void {
    const comment = commentStr.trim();
    if (!comment.startsWith("//")) return;

    const commentContent = comment.substring(2).trim();

    const configMatch = commentContent.match(/^\[(.*)\]$/);
    if (configMatch) {
      const configStr = configMatch[1].trim();

      if (param.type === "number") {
        const numParam = param as Partial<NumericParameter>;
        const range = this.parseRange(configStr);
        if (range) {
          numParam.min = range.min;
          numParam.max = range.max;
          if (range.step !== undefined) numParam.step = range.step;
        } else {
          const options = this.parseChoices(
            configStr,
            "number",
          ) as ParameterOption<number>[];
          if (options.length > 0) numParam.options = options;
        }
      } else if (param.type === "string") {
        const strParam = param as Partial<StringParameter>;
        const hinted = editorFromHint(configStr);
        if (hinted) {
          Object.assign(strParam, hinted);
          return;
        }
        const options = this.parseChoices(
          configStr,
          "string",
        ) as ParameterOption<string>[];
        if (options.length > 0) strParam.options = options;
      }
    } else if (commentContent) {
      param.description = commentContent;
    }
  }
}
