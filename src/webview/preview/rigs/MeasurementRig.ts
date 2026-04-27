import { Color, Group, Object3D, Vector2, Vector3 } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  MeasurementProperties,
  ObjectProperties,
} from "../../contexts/SelectedObjectContext";
import { Rig } from "./Rig";

const LINE_WIDTH = 2;

export class MeasurementRig extends Rig {
  readonly id: string;
  public readonly group: Group;

  private pointA: Vector3;
  private pointB: Vector3;
  private line: Line2;
  private markerA: CSS2DObject;
  private markerB: CSS2DObject;
  private distanceLabel: CSS2DObject;
  private _visible = true;
  private colorHex: string;

  constructor(
    id: string,
    pointA: Vector3,
    pointB: Vector3,
    color: Color,
  ) {
    super();
    this.id = id;
    this.pointA = pointA.clone();
    this.pointB = pointB.clone();
    this.colorHex = `#${color.getHexString()}`;
    this.group = new Group();
    this.group.name = `MeasurementRig:${id}`;

    // Line between the two points (Line2 supports actual thick lines via shader)
    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, 0, 0, 0]);
    const material = new LineMaterial({
      color: color,
      linewidth: LINE_WIDTH,
      depthTest: false,
      worldUnits: false,
    });
    material.resolution.set(window.innerWidth, window.innerHeight);
    this.line = new Line2(geometry, material);
    this.line.frustumCulled = false;
    // Render last so the line is drawn on top of everything else, including
    // cross-section stencil caps (which can otherwise occlude it despite
    // depthTest being disabled, because draw order decides without a depth test).
    this.line.renderOrder = 1000;
    this.group.add(this.line);

    // CSS2D endpoint markers and distance label
    this.markerA = this.createMarker();
    this.markerB = this.createMarker();
    this.distanceLabel = this.createDistanceLabel();
    this.group.add(this.markerA);
    this.group.add(this.markerB);
    this.group.add(this.distanceLabel);

    this.syncGeometry();
  }

  /** Update LineMaterial resolution when the canvas resizes. */
  public setResolution(size: Vector2): void {
    (this.line.material as LineMaterial).resolution.copy(size);
  }

  private createMarker(): CSS2DObject {
    const el = document.createElement("div");
    el.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${this.colorHex};
      transform: translate(-50%, -50%);
      pointer-events: none;
    `;
    return new CSS2DObject(el);
  }

  private createDistanceLabel(): CSS2DObject {
    const el = document.createElement("div");
    el.style.cssText = `
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.65);
      color: white;
      font-size: 11px;
      font-family: monospace;
      border-radius: 3px;
      transform: translate(-50%, -150%);
      white-space: nowrap;
      pointer-events: none;
    `;
    return new CSS2DObject(el);
  }

  private syncGeometry() {
    const mid = this.pointA.clone().add(this.pointB).multiplyScalar(0.5);

    (this.line.geometry as LineGeometry).setPositions([
      this.pointA.x,
      this.pointA.y,
      this.pointA.z,
      this.pointB.x,
      this.pointB.y,
      this.pointB.z,
    ]);
    this.line.computeLineDistances();

    this.markerA.position.copy(this.pointA);
    this.markerB.position.copy(this.pointB);
    this.distanceLabel.position.copy(mid);

    const dx = this.pointB.x - this.pointA.x;
    const dy = this.pointB.y - this.pointA.y;
    const dz = this.pointB.z - this.pointA.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    (this.distanceLabel.element as HTMLElement).textContent =
      `${dist.toFixed(2)} mm`;
  }

  getSelectableObjects(): Object3D[] {
    // Selected via scene tree only — no raycasting needed
    return [];
  }

  getTransformTarget(): Object3D {
    return this.group;
  }

  getSceneRoot(): Object3D {
    return this.group;
  }

  override get supportsTransform(): boolean {
    return false;
  }

  getProperties(): ObjectProperties {
    const dx = this.pointB.x - this.pointA.x;
    const dy = this.pointB.y - this.pointA.y;
    const dz = this.pointB.z - this.pointA.z;
    const props: MeasurementProperties = {
      type: "measurement",
      pointAX: Math.round(this.pointA.x * 100) / 100,
      pointAY: Math.round(this.pointA.y * 100) / 100,
      pointAZ: Math.round(this.pointA.z * 100) / 100,
      pointBX: Math.round(this.pointB.x * 100) / 100,
      pointBY: Math.round(this.pointB.y * 100) / 100,
      pointBZ: Math.round(this.pointB.z * 100) / 100,
      deltaX: Math.round(dx * 100) / 100,
      deltaY: Math.round(dy * 100) / 100,
      deltaZ: Math.round(dz * 100) / 100,
      distance: Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 100) / 100,
    };
    return props;
  }

  setProperty(key: string, value: number): void {
    switch (key) {
      case "pointAX": this.pointA.x = value; break;
      case "pointAY": this.pointA.y = value; break;
      case "pointAZ": this.pointA.z = value; break;
      case "pointBX": this.pointB.x = value; break;
      case "pointBY": this.pointB.y = value; break;
      case "pointBZ": this.pointB.z = value; break;
      default: return;
    }
    this.syncGeometry();
  }

  setSelected(_selected: boolean): void {
    // Measurements are inherently visible at full opacity; selection is
    // communicated via the scene tree and properties panel.
  }

  setVisible(visible: boolean): void {
    this._visible = visible;
    this.group.visible = visible;
  }

  override get visible(): boolean {
    return this._visible;
  }

  dispose(): void {
    this.line.geometry.dispose();
    (this.line.material as LineMaterial).dispose();
    this.markerA.element.remove();
    this.markerB.element.remove();
    this.distanceLabel.element.remove();
  }
}
