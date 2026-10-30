import { SceneObjectDescriptor } from "../contexts/SceneContext";
import { sceneObjectMeta } from "./sceneObjectMeta";

export const defaultScene: SceneObjectDescriptor[] = [
  {
    id: "camera-default",
    type: "camera",
    name: `${sceneObjectMeta["camera"].label} 1`,
    visible: true,
    active: true,
  },
  {
    id: "ambient-light-default",
    type: "ambient-light",
    name: `${sceneObjectMeta["ambient-light"].label} 1`,
    visible: false,
    active: true,
  },
  {
    id: "directional-light-default",
    type: "directional-light",
    name: `${sceneObjectMeta["directional-light"].label} 1`,
    visible: false,
    active: true,
  },
  {
    id: "spot-light-default",
    type: "spot-light",
    name: `${sceneObjectMeta["spot-light"].label} 1`,
    visible: false,
    active: true,
  },
  {
    id: "point-light-default",
    type: "point-light",
    name: `${sceneObjectMeta["point-light"].label} 1`,
    visible: false,
    active: true,
  },
];
