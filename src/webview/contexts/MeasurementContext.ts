import { createContext } from "@lit/context";

export enum SnappingMode {
  Vertex = "vertex",
  Edge = "edge",
  Face = "face",
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Measurement {
  pointA: Point3D | null;
  pointB: Point3D | null;
  deltaX: number | null;
  deltaY: number | null;
  deltaZ: number | null;
  distance: number | null;
  hoveredPoint: Point3D | null;
  nextPointToSet: "A" | "B";
}

export interface MeasurementContext {
  isActive: boolean;
  snappingMode: SnappingMode;
  measurement: Measurement;
  setActive: (active: boolean) => void;
  setSnappingMode: (mode: SnappingMode) => void;
  setPointA: (point: Point3D | null) => void;
  setPointB: (point: Point3D | null) => void;
  setHoveredPoint: (point: Point3D | null) => void;
  reset: () => void;
}

const defaultMeasurement: Measurement = {
  pointA: null,
  pointB: null,
  deltaX: null,
  deltaY: null,
  deltaZ: null,
  distance: null,
  hoveredPoint: null,
  nextPointToSet: "A",
};

export const measurementContext =
  createContext<MeasurementContext>("measurement");
