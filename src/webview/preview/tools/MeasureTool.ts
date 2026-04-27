import {
  Color,
  Group,
  MathUtils,
  Mesh,
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
import { MeasurementRig } from "../rigs/MeasurementRig";
import { Rig } from "../rigs/Rig";
import { Tool, ViewportBindings } from "./Tool";

export enum SnappingMode {
  Vertex = "vertex",
  Edge = "edge",
  Face = "face",
}

/** Screen-space snap radius in pixels. */
const SNAP_PIXELS = 20;

export interface MeasureToolContext {
  raycaster: Raycaster;
  camera: () => PerspectiveCamera | import("three").OrthographicCamera;
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
  private pendingAMarker: CSS2DObject;
  private previewLine: Line2;

  constructor(ctx: MeasureToolContext) {
    this.ctx = ctx;
    const colorHex = `#${ctx.color.getHexString()}`;

    this.previewGroup = new Group();

    this.hoverMarker = this.createMarker(colorHex);
    this.hoverMarker.visible = false;
    this.previewGroup.add(this.hoverMarker);

    this.pendingAMarker = this.createMarker(colorHex);
    this.pendingAMarker.visible = false;
    this.previewGroup.add(this.pendingAMarker);

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
    this.pendingAMarker.visible = false;
    this.previewLine.visible = false;

    // Remove preview from scene
    this.ctx.scene.remove(this.previewGroup);

    // Clean up DOM elements
    this.hoverMarker.element.remove();
    this.pendingAMarker.element.remove();
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
      this.pendingAMarker.position.copy(point);
      this.pendingAMarker.visible = true;
    } else {
      const id = `measurement-${Date.now()}`;
      const rig = new MeasurementRig(id, this.pendingA, point, this.ctx.color);
      this.ctx.addObject(rig, "measurement");
      this.pendingA = null;
      this.pendingAMarker.visible = false;
      this.previewLine.visible = false;
    }
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

    const intersects = this.ctx.raycaster.intersectObject(
      this.ctx.modelGroup,
      true,
    );
    if (intersects.length === 0) return null;

    const intersection = intersects[0];
    let snapped = intersection.point;
    const threshold = this.snapThresholdAt(intersection.point);
    const variant = this.ctx.variant();

    if (variant === SnappingMode.Vertex && intersection.object instanceof Mesh) {
      snapped = this.snapToVertex(intersection.object, intersection.point, threshold);
    } else if (variant === SnappingMode.Edge && intersection.object instanceof Mesh) {
      snapped = this.snapToEdge(intersection.object, intersection.point, threshold);
    }

    return new Vector3(
      Math.round(snapped.x * 100) / 100,
      Math.round(snapped.y * 100) / 100,
      Math.round(snapped.z * 100) / 100,
    );
  }

  private snapThresholdAt(point: Vector3): number {
    const camera = this.ctx.camera();
    const height = this.ctx.renderer.domElement.clientHeight;

    if (camera instanceof PerspectiveCamera) {
      const distance = camera.position.distanceTo(point);
      const worldPerPixel =
        (2 * distance * Math.tan(MathUtils.degToRad(camera.fov / 2))) / height;
      return worldPerPixel * SNAP_PIXELS;
    }

    const worldPerPixel = (camera.top - camera.bottom) / (camera.zoom * height);
    return worldPerPixel * SNAP_PIXELS;
  }

  private snapToVertex(mesh: Mesh, point: Vector3, threshold: number): Vector3 {
    const positions = mesh.geometry.attributes.position;
    if (!positions) return point;

    let closest = point.clone();
    let closestDist = Infinity;
    const world = mesh.matrixWorld;

    for (let i = 0; i < positions.count; i++) {
      const v = new Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i),
      ).applyMatrix4(world);
      const d = v.distanceTo(point);
      if (d < closestDist && d < threshold) {
        closestDist = d;
        closest = v;
      }
    }
    return closest;
  }

  private snapToEdge(mesh: Mesh, point: Vector3, threshold: number): Vector3 {
    const positions = mesh.geometry.attributes.position;
    const indices = mesh.geometry.index;
    if (!positions) return point;

    const edges: [number, number][] = [];
    if (indices) {
      const arr = indices.array as Uint32Array | Uint16Array;
      for (let i = 0; i < arr.length; i += 3) {
        edges.push(
          [arr[i], arr[i + 1]],
          [arr[i + 1], arr[i + 2]],
          [arr[i + 2], arr[i]],
        );
      }
    } else {
      for (let i = 0; i < positions.count; i += 3) {
        edges.push([i, i + 1], [i + 1, i + 2], [i + 2, i]);
      }
    }

    const world = mesh.matrixWorld;
    let closest = point.clone();
    let closestDist = Infinity;

    for (const [i1, i2] of edges) {
      const v1 = new Vector3(
        positions.getX(i1),
        positions.getY(i1),
        positions.getZ(i1),
      ).applyMatrix4(world);
      const v2 = new Vector3(
        positions.getX(i2),
        positions.getY(i2),
        positions.getZ(i2),
      ).applyMatrix4(world);
      const ep = this.closestPointOnSegment(v1, v2, point);
      const d = ep.distanceTo(point);
      if (d < closestDist && d < threshold) {
        closestDist = d;
        closest = ep;
      }
    }
    return closest;
  }

  private closestPointOnSegment(a: Vector3, b: Vector3, p: Vector3): Vector3 {
    const pa = p.clone().sub(a);
    const ba = b.clone().sub(a);
    const t = Math.max(0, Math.min(1, pa.dot(ba) / ba.dot(ba)));
    return a.clone().add(ba.multiplyScalar(t));
  }

  // ============= Preview =============

  private updatePreview(hoverPoint: Vector3 | null): void {
    if (!hoverPoint) {
      this.hoverMarker.visible = false;
      this.previewLine.visible = false;
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
      this.previewLine.visible = true;
    }
  }

  private createMarker(color: string): CSS2DObject {
    const el = document.createElement("div");
    el.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${color};
      transform: translate(-50%, -50%);
      pointer-events: none;
    `;
    return new CSS2DObject(el);
  }
}
