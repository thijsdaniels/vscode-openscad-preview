import type { IconName } from "../components/atoms/Icon";
import { SceneObjectType } from "../contexts/SceneContext";
import { t } from "../i18n/t";

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
  camera: { label: t("object.camera"), icon: "camera", supportsActive: false },
  "cross-section-plane": {
    label: t("object.crossSection"),
    icon: "cross-section",
    supportsActive: true,
  },
  "ambient-light": {
    label: t("object.ambientLight"),
    icon: "light-ambient",
    supportsActive: true,
  },
  "directional-light": {
    label: t("object.directionalLight"),
    icon: "light-directional",
    supportsActive: true,
  },
  "spot-light": {
    label: t("object.spotLight"),
    icon: "light-spot",
    supportsActive: true,
  },
  "point-light": {
    label: t("object.pointLight"),
    icon: "light-point",
    supportsActive: true,
  },
  measurement: {
    label: t("object.measurement"),
    icon: "measurement",
    supportsActive: false,
  },
};
