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
 *
 * `fromModel` marks objects produced by each render (model parts): they cannot
 * be removed from the tree and are never written to the persisted scene.
 */
export const sceneObjectMeta: Record<
  SceneObjectType,
  {
    label: string;
    icon: IconName;
    supportsActive: boolean;
    fromModel: boolean;
    visibleTip: string;
  }
> = {
  camera: {
    label: t("object.camera"),
    icon: "camera",
    supportsActive: false,
    fromModel: false,
    visibleTip: t("scene.visible.tip"),
  },
  "cross-section-plane": {
    label: t("object.crossSection"),
    icon: "cross-section",
    supportsActive: true,
    fromModel: false,
    visibleTip: t("scene.visible.tip"),
  },
  "ambient-light": {
    label: t("object.ambientLight"),
    icon: "light-ambient",
    supportsActive: true,
    fromModel: false,
    visibleTip: t("scene.visible.tip"),
  },
  "directional-light": {
    label: t("object.directionalLight"),
    icon: "light-directional",
    supportsActive: true,
    fromModel: false,
    visibleTip: t("scene.visible.tip"),
  },
  "spot-light": {
    label: t("object.spotLight"),
    icon: "light-spot",
    supportsActive: true,
    fromModel: false,
    visibleTip: t("scene.visible.tip"),
  },
  "point-light": {
    label: t("object.pointLight"),
    icon: "light-point",
    supportsActive: true,
    fromModel: false,
    visibleTip: t("scene.visible.tip"),
  },
  measurement: {
    label: t("object.measurement"),
    icon: "measurement",
    supportsActive: false,
    fromModel: false,
    visibleTip: t("scene.visible.tip"),
  },
  "model-part": {
    label: t("object.modelPart"),
    icon: "model-part",
    supportsActive: false,
    fromModel: true,
    visibleTip: t("scene.visiblePart.tip"),
  },
};
