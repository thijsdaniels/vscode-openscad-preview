import { createContext } from "@lit/context";

export enum ActiveTool {
  Select = "select",
  Move = "move",
  Rotate = "rotate",
  Scale = "scale",
  Measure = "measure",
}

export interface ActiveToolContext {
  activeTool: ActiveTool;
  variant: string | null;
  setActiveTool: (tool: ActiveTool, variant?: string | null) => void;
  setVariant: (variant: string) => void;
}

export const activeToolContext =
  createContext<ActiveToolContext>("active-tool");
