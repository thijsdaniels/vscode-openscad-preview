import { createContext } from "@lit/context";

export enum Environment {
  None = "none",
  Grid = "grid",
  BuildPlate = "buildPlate",
}

export enum RenderMode {
  Solid = "solid",
  Wireframe = "wireframe",
  XRay = "xray",
}

export enum CameraMode {
  Perspective = "perspective",
  Orthographic = "orthographic",
}

export interface ViewSettings {
  environment: Environment;
  renderMode: RenderMode;
  camera: CameraMode;
  shadows: boolean;
  colors: boolean;
  crossSection: boolean;
}

export interface ViewSettingsContext {
  settings: ViewSettings;
  get: <K extends keyof ViewSettings>(key: K) => ViewSettings[K];
  is: <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => boolean;
  set: <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => void;
}

export const viewSettingsContext =
  createContext<ViewSettingsContext>("view-settings");
