import { Tool } from "./Tool";

export class ScaleTool implements Tool {
  readonly gizmoMode = "scale" as const;
  readonly capturesClick = false;

  activate(): void {}
  deactivate(): void {}
}
