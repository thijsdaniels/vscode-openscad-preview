import { createContext } from "@lit/context";
import { SceneObjectType } from "./SceneContext";

export interface CrossSectionPlaneProperties {
  type: "cross-section-plane";
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

export interface AmbientLightProperties {
  type: "ambient-light";
  intensity: number;
}

export interface DirectionalLightProperties {
  type: "directional-light";
  intensity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
}

export interface SpotLightProperties {
  type: "spot-light";
  intensity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  angle: number;
  penumbra: number;
}

export interface PointLightProperties {
  type: "point-light";
  intensity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  decay: number;
}

export interface CameraProperties {
  type: "camera";
  fov: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

export interface MeasurementProperties {
  type: "measurement";
  pointAX: number;
  pointAY: number;
  pointAZ: number;
  pointBX: number;
  pointBY: number;
  pointBZ: number;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  distance: number;
}

export type ObjectProperties =
  | CrossSectionPlaneProperties
  | AmbientLightProperties
  | DirectionalLightProperties
  | SpotLightProperties
  | PointLightProperties
  | CameraProperties
  | MeasurementProperties;

export interface SelectedObjectContext {
  type: SceneObjectType | null;
  properties: ObjectProperties | null;
  setProperty: (key: string, value: number) => void;
}

export const selectedObjectContext =
  createContext<SelectedObjectContext>("selected-object");
