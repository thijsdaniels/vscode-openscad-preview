import {
  Color,
  Group,
  Matrix4,
  Mesh,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { SceneObjectType } from "../../contexts/SceneContext";
import { isClippedAway } from "../isClippedAway";
import { MeasurementRig } from "../rigs/MeasurementRig";
import { Rig } from "../rigs/Rig";
import { MeasureArrow } from "../widgets/MeasureArrow";
import { meshFeatures } from "./MeshFeatures";
import { Tool, ViewportBindings } from "./Tool";

export enum SnappingMode {
  Vertex = "vertex",
  Edge = "edge",
  Face = "face",
}

export interface MeasureToolContext {
  raycaster: Raycaster;
  camera: () => PerspectiveCamera | OrthographicCamera;
  renderer: WebGLRenderer;
  css2dRenderer: CSS2DRenderer;
  modelGroup: Group;
  scene: Scene;
  color: Color;
  variant: () => string | null;
  addObject: (rig: Rig, type: SceneObjectType) => void;
}

export class MeasureTool implements Tool {
  readonly gizmoMode = null;
  readonly capturesClick = true;

  private canvas: HTMLElement | null = null;
  private ctx: MeasureToolContext;

  // Two-click state
  private pendingA: Vector3 | null = null;

  // Preview elements
  private previewGroup: Group;
  private hoverMarker: CSS2DObject;
  private arrowA: MeasureArrow;
  private arrowB: MeasureArrow;
  private previewLine: Line2;

  constructor(ctx: MeasureToolContext) {
    this.ctx = ctx;
    const colorHex = `#${ctx.color.getHexString()}`;

    this.previewGroup = new Group();

    this.hoverMarker = this.createMarker(colorHex);
    this.hoverMarker.visible = false;
    this.previewGroup.add(this.hoverMarker);

    this.arrowA = new MeasureArrow(colorHex);
    this.arrowB = new MeasureArrow(colorHex);
    this.arrowA.visible = false;
    this.arrowB.visible = false;
    this.previewGroup.add(this.arrowA, this.arrowB);

    const geo = new LineGeometry();
    geo.setPositions([0, 0, 0, 0, 0, 0]);
    const material = new LineMaterial({
      color: ctx.color,
      linewidth: 2,
      depthTest: false,
      worldUnits: false,
    });
    const canvas = ctx.renderer.domElement;
    material.resolution.set(canvas.clientWidth, canvas.clientHeight);
    this.previewLine = new Line2(geo, material);
    this.previewLine.frustumCulled = false;
    this.previewLine.renderOrder = 1000;
    this.previewLine.visible = false;
    this.previewGroup.add(this.previewLine);
  }

  activate(bindings: ViewportBindings): void {
    this.canvas = bindings.canvas;
    this.canvas.addEventListener("mousemove", this.handleMove);
    this.canvas.addEventListener("click", this.handleClick);
    this.ctx.scene.add(this.previewGroup);
  }

  deactivate(): void {
    this.canvas?.removeEventListener("mousemove", this.handleMove);
    this.canvas?.removeEventListener("click", this.handleClick);
    this.canvas = null;

    // Reset state
    this.pendingA = null;
    this.hoverMarker.visible = false;
    this.arrowA.visible = false;
    this.arrowB.visible = false;
    this.previewLine.visible = false;

    // Remove preview from scene
    this.ctx.scene.remove(this.previewGroup);

    // Clean up DOM elements
    this.hoverMarker.element.remove();
    this.arrowA.element.remove();
    this.arrowB.element.remove();
    this.previewLine.geometry.dispose();
    (this.previewLine.material as LineMaterial).dispose();
  }

  // ============= Event handlers =============

  private handleMove = (e: MouseEvent) => {
    const point = this.getIntersectionPoint(e);
    this.updatePreview(point);
  };

  private handleClick = (e: MouseEvent) => {
    const point = this.getIntersectionPoint(e);
    if (!point) return;

    if (!this.pendingA) {
      this.pendingA = point.clone();
    } else {
      const id = `measurement-${Date.now()}`;
      const rig = new MeasurementRig(id, this.pendingA, point, this.ctx.color);
      this.ctx.addObject(rig, "measurement");
      this.pendingA = null;
    }
    this.updatePreview(point);
  };

  // ============= Raycasting + snapping =============

  private getIntersectionPoint(event: MouseEvent): Vector3 | null {
    if (!this.canvas) return null;

    const rect = this.canvas.getBoundingClientRect();
    const mouse = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.ctx.raycaster.setFromCamera(mouse, this.ctx.camera());

    // Nearest hit on a shown mesh, outside the regions cut away by a section.
    const intersection = this.ctx.raycaster
      .intersectObject(this.ctx.modelGroup, true)
      .find((hit) => isShown(hit.object) && !isClippedAway(hit));
    if (!intersection || !(intersection.object instanceof Mesh)) return null;

    const snapped = this.snap(intersection.object, intersection.point);
    return new Vector3(
      Math.round(snapped.x * 100) / 100,
      Math.round(snapped.y * 100) / 100,
      Math.round(snapped.z * 100) / 100,
    );
  }

  /**
   * Stick the hit point to the nearest real corner or edge of the mesh, per
   * the snapping mode. The search runs in the mesh's local space.
   */
  private snap(mesh: Mesh, point: Vector3): Vector3 {
    const variant = this.ctx.variant();
    if (variant !== SnappingMode.Vertex && variant !== SnappingMode.Edge) {
      return point;
    }

    const features = meshFeatures(mesh.geometry);
    const local = point
      .clone()
      .applyMatrix4(new Matrix4().copy(mesh.matrixWorld).invert());
    const closest =
      variant === SnappingMode.Vertex
        ? closestVertex(features.vertices, local)
        : closestOnEdges(features.edges, local);
    return closest ? closest.applyMatrix4(mesh.matrixWorld) : point;
  }

  // ============= Preview =============

  private updatePreview(hoverPoint: Vector3 | null): void {
    const showLine = !!(hoverPoint && this.pendingA);
    this.previewLine.visible = showLine;
    this.arrowA.visible = showLine;
    this.arrowB.visible = showLine;

    if (!hoverPoint) {
      this.hoverMarker.visible = false;
      return;
    }

    this.hoverMarker.position.copy(hoverPoint);
    this.hoverMarker.visible = true;

    if (this.pendingA) {
      (this.previewLine.geometry as LineGeometry).setPositions([
        this.pendingA.x,
        this.pendingA.y,
        this.pendingA.z,
        hoverPoint.x,
        hoverPoint.y,
        hoverPoint.z,
      ]);
      this.previewLine.computeLineDistances();
      this.arrowA.set(this.pendingA, hoverPoint);
      this.arrowB.set(hoverPoint, this.pendingA);
    }
  }

  /** Hollow ring showing where the next point will land. */
  private createMarker(color: string): CSS2DObject {
    const el = document.createElement("div");
    el.style.cssText = `
      width: 10px;
      height: 10px;
      box-sizing: border-box;
      border-radius: 50%;
      border: 2px solid ${color};
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
      pointer-events: none;
    `;
    return new CSS2DObject(el);
  }
}

/** False when the object or one of its ancestors is hidden. */
function isShown(object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) {
    if (!o.visible) return false;
  }
  return true;
}

function closestVertex(vertices: Vector3[], point: Vector3): Vector3 | null {
  let closest: Vector3 | null = null;
  let closestDist = Infinity;
  for (const v of vertices) {
    const d = v.distanceToSquared(point);
    if (d < closestDist) {
      closestDist = d;
      closest = v;
    }
  }
  return closest?.clone() ?? null;
}

function closestOnEdges(endpoints: Vector3[], point: Vector3): Vector3 | null {
  let closest: Vector3 | null = null;
  let closestDist = Infinity;
  const candidate = new Vector3();
  for (let i = 0; i < endpoints.length; i += 2) {
    closestPointOnSegment(endpoints[i], endpoints[i + 1], point, candidate);
    const d = candidate.distanceToSquared(point);
    if (d < closestDist) {
      closestDist = d;
      closest = candidate.clone();
    }
  }
  return closest;
}

function closestPointOnSegment(
  a: Vector3,
  b: Vector3,
  p: Vector3,
  target: Vector3,
): Vector3 {
  target.subVectors(b, a);
  const lengthSq = target.lengthSq();
  const t =
    lengthSq > 0
      ? Math.max(0, Math.min(1, p.clone().sub(a).dot(target) / lengthSq))
      : 0;
  return target.multiplyScalar(t).add(a);
}
