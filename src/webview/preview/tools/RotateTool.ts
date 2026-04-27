import { Tool } from "./Tool";

export class RotateTool implements Tool {
  readonly gizmoMode = "rotate" as const;
  readonly capturesClick = false;

  activate(): void {}
  deactivate(): void {}
}
