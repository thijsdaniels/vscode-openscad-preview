import { Tool, ViewportBindings } from "../tools/Tool";

export class ToolManager {
  private currentTool: Tool | null = null;
  private bindings: ViewportBindings | null = null;

  public setBindings(bindings: ViewportBindings): void {
    this.bindings = bindings;
  }

  public switchTo(tool: Tool): void {
    this.currentTool?.deactivate();
    this.currentTool = tool;
    if (this.bindings) {
      this.currentTool.activate(this.bindings);
    }
  }

  public get activeTool(): Tool | null {
    return this.currentTool;
  }

  public dispose(): void {
    this.currentTool?.deactivate();
    this.currentTool = null;
  }
}
