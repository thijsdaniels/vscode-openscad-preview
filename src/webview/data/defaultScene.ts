import { SceneObjectDescriptor } from "../contexts/SceneContext";

export const defaultScene: SceneObjectDescriptor[] = [
  {
    id: "camera-default",
    type: "camera",
    name: "Camera 1",
    visible: true,
    active: true,
  },
  {
    id: "ambient-light-default",
    type: "ambient-light",
    name: "Ambient Light 1",
    visible: false,
    active: true,
  },
  {
    id: "directional-light-default",
    type: "directional-light",
    name: "Directional Light 1",
    visible: false,
    active: true,
  },
  {
    id: "spot-light-default",
    type: "spot-light",
    name: "Spot Light 1",
    visible: false,
    active: true,
  },
  {
    id: "point-light-default",
    type: "point-light",
    name: "Point Light 1",
    visible: false,
    active: true,
  },
];
