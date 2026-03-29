import { createContext } from "@lit/context";

export interface Panels {
  toolbar: boolean;
  parameters: boolean;
  debug: boolean;
  measurement: boolean;
}

export interface PanelContext {
  panels: Panels;
  toggle: (panel: keyof Panels) => void;
}

export const panelContext = createContext<PanelContext>("panels");
