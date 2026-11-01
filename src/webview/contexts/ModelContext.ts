import { createContext } from "@lit/context";
import { ModelFormat } from "../../shared/types/ModelFormat";

export interface ModelContext {
  format: ModelFormat | null;
  base64Data: string | null;
  isLoading: boolean;
  loadingMessage: string;
  /** Latched: re-render automatically on file save or parameter change. */
  autoRender: boolean;
  /** Changes arrived while automatic rendering was off. */
  renderPending: boolean;
  /** Lazy union: one part per top-level object instead of a merged model. */
  explode: boolean;
  export: () => void;
  sendToSlicer: () => void;
  renderNow: () => void;
  toggleAutoRender: () => void;
  toggleExplode: () => void;
  /** Opens the VS Code settings editor on this extension's settings. */
  openSettings: () => void;
}

export const modelContext = createContext<ModelContext>("model");
