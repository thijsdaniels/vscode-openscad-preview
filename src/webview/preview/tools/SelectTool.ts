import { Tool } from "./Tool";

export class SelectTool implements Tool {
  readonly gizmoMode = null;
  readonly capturesClick = false;

  activate(): void {}
  deactivate(): void {}
}
