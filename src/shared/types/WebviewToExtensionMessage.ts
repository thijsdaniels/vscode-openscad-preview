import { ParameterLabelMode } from "./ParameterLabelMode";

export type WebviewToExtensionMessage =
  | { type: "ready" }
  | {
      type: "parameterChanged";
      name: string;
      value: string | number | boolean | undefined;
    }
  | { type: "pickParameterValue"; name: string }
  | { type: "saveParameterSet"; name: string }
  | { type: "promptSaveParameterSet" }
  | { type: "deleteParameterSet"; name: string }
  | { type: "applyParameterSet"; name: string | undefined }
  | { type: "exportModel" }
  | { type: "sendToSlicer" }
  | { type: "persistScene"; snapshot: unknown }
  | { type: "setAutoRender"; enabled: boolean }
  | { type: "renderNow" }
  | { type: "setExplode"; enabled: boolean }
  | { type: "openSettings" }
  | { type: "setParameterLabel"; mode: ParameterLabelMode }
  | { type: "error"; message: string };
