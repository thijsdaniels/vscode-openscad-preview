import type { IconName } from "../components/atoms/Icon";
import { SceneObjectType } from "../contexts/SceneContext";

/**
 * Metadata for each scene object type.
 *
 * `supportsActive` indicates whether the object has a meaningful "active" state
 * that affects the scene (e.g. lights cast light, cross-section planes clip).
 * Objects without an active state (cameras, measurements) are always conceptually
 * "on" — their visibility toggle is the only thing that controls them.
 */
export const sceneObjectMeta: Record<
  SceneObjectType,
  { label: string; icon: IconName; supportsActive: boolean }
> = {
  camera: { label: "Camera", icon: "camera", supportsActive: false },
  "cross-section-plane": {
    label: "Cross-Section",
    icon: "cross-section",
    supportsActive: true,
  },
  "ambient-light": {
    label: "Ambient Light",
    icon: "light-ambient",
    supportsActive: true,
  },
  "directional-light": {
    label: "Directional Light",
    icon: "light-directional",
    supportsActive: true,
  },
  "spot-light": {
    label: "Spot Light",
    icon: "light-spot",
    supportsActive: true,
  },
  "point-light": {
    label: "Point Light",
    icon: "light-point",
    supportsActive: true,
  },
  measurement: {
    label: "Measurement",
    icon: "measurement",
    supportsActive: false,
  },
};
