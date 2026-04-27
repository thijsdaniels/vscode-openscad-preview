import { Tool } from "./Tool";

export class MoveTool implements Tool {
  readonly gizmoMode = "translate" as const;
  readonly capturesClick = false;

  activate(): void {}
  deactivate(): void {}
}
