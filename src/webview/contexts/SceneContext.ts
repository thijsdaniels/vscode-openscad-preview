import { createContext } from "@lit/context";
import type { ObjectProperties } from "./SelectedObjectContext";

export type SceneObjectType =
  | "cross-section-plane"
  | "ambient-light"
  | "directional-light"
  | "spot-light"
  | "point-light"
  | "camera"
  | "measurement";

export interface SceneObjectDescriptor {
  id: string;
  type: SceneObjectType;
  name: string;
  /** Whether the indicator (plane quad + outline) is shown in the viewport. */
  visible: boolean;
  /** Whether the object applies its effect to the scene (clipping, etc.). */
  active: boolean;
}

export interface SceneContext {
  objects: SceneObjectDescriptor[];
  selectedId: string | null;
  activeCameraId: string;
  addObject: (type: SceneObjectType) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  renameObject: (id: string, name: string) => void;
  setVisible: (id: string, visible: boolean) => void;
  setActive: (id: string, active: boolean) => void;
  setActiveCamera: (id: string) => void;
}

export const sceneContext = createContext<SceneContext>("scene");

/**
 * Serialised form of the scene used for workspaceState persistence.
 * `properties` is the per-object Three.js state captured from `Stage` at
 * persist time (positions, intensities, etc.) and re-applied on load.
 */
export interface SceneSnapshot {
  version: 1;
  activeCameraId: string;
  objects: Array<SceneObjectDescriptor & { properties?: ObjectProperties }>;
}
