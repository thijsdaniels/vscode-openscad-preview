export type WebviewToExtensionMessage =
  | { type: "ready" }
  | {
      type: "parameterChanged";
      name: string;
      value: string | number | boolean | undefined;
    }
  | { type: "saveParameterSet"; name: string }
  | { type: "promptSaveParameterSet" }
  | { type: "deleteParameterSet"; name: string }
  | { type: "applyParameterSet"; name: string | undefined }
  | { type: "exportModel" }
  | { type: "sendToSlicer" }
  | { type: "persistScene"; snapshot: unknown }
  | { type: "error"; message: string };
