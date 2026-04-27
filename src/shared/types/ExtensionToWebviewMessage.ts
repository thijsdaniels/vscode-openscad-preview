import { ModelFormat } from "./ModelFormat";
import { ScadParameter } from "./ScadParameter";

export type ExtensionToWebviewMessage =
  | { type: "ready" }
  | { type: "loadingState"; loading: boolean; message?: string }
  | {
      type: "update";
      content: string; // base64 payload
      format: ModelFormat;
    }
  | {
      type: "updateParameters";
      parameters: ScadParameter[];
      parameterSets: Record<string, Record<string, string>>;
      activeSetName: string | undefined;
      overrides: Record<string, string | number | boolean>;
    }
  | { type: "error"; message: string }
  | { type: "log"; message: string }
  | { type: "loadScene"; snapshot: unknown | null };
