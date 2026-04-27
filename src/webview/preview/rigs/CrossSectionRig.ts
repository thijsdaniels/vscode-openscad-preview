import {
  AlwaysStencilFunc,
  BackSide,
  Box3,
  Color,
  DecrementWrapStencilOp,
  DoubleSide,
  FrontSide,
  Group,
  IncrementWrapStencilOp,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  Object3D,
  Plane,
  PlaneGeometry,
  Raycaster,
  ReplaceStencilOp,
  Vector2,
  Vector3,
} from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { CrossSectionPlaneProperties } from "../../contexts/SelectedObjectContext";
import { Theme } from "../Stage";
import { Rig } from "./Rig";

// Each rig occupies one render-order tier so stencil→cap cycles never overlap.
// Tier i: stencil at TIER * (i+1), cap at TIER * (i+1) + 1.
// Stage places the model at MODEL_CLIP_RENDER_ORDER (between tier 0 and tier 1).
const TIER = 10;

const CAP_SIZE = 9_999;
const VIS_PLANE_PADDING = 10;
const OPACITY_DESELECTED = 0.05;
const OPACITY_SELECTED = 0.15;

export class CrossSectionRig extends Rig {
  public readonly id: string;
  public readonly group = new Group();
  public readonly plane = new Plane();

  // The pivot is the transform target — TransformControls attaches to it.
  public readonly pivot = new Object3D();

  private visPlane: Mesh;
  private visGeometry = new PlaneGeometry(1, 1);
  private visOutline: Line2;
  // prettier-ignore
  private visOutlineGeometry = new LineGeometry().setPositions([
    -0.5, -0.5, 0,
     0.5, -0.5, 0,
     0.5,  0.5, 0,
    -0.5,  0.5, 0,
    -0.5, -0.5, 0,
  ]);
  private capMesh: Mesh;
  private capGeometry = new PlaneGeometry(CAP_SIZE, CAP_SIZE);
  private stencilGroup = new Group();

  private tierIndex = 0;
  private _visible = true;
  private _active = true;
  private modelBox = new Box3();
  private raycaster = new Raycaster();

  constructor(id: string, color: Color) {
    super();
    this.id = id;

    const visMat = new MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: OPACITY_DESELECTED,
      side: DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.visPlane = new Mesh(this.visGeometry, visMat);

    const outlineMat = new LineMaterial({
      color: color,
      linewidth: 2,
      fog: false,
    });
    this.visOutline = new Line2(this.visOutlineGeometry, outlineMat);
    this.visOutline.computeLineDistances();
    this.visPlane.add(this.visOutline);

    const capMat = new MeshStandardMaterial({
      color: color,
      side: DoubleSide,
      fog: false,
    });
    capMat.stencilWrite = true;
    capMat.stencilRef = 0;
    capMat.stencilFunc = NotEqualStencilFunc;
    capMat.stencilFail = ReplaceStencilOp;
    capMat.stencilZFail = ReplaceStencilOp;
    capMat.stencilZPass = ReplaceStencilOp;

    this.capMesh = new Mesh(this.capGeometry, capMat);
    this.capMesh.renderOrder = TIER + 1; // tier 0 default
    this.capMesh.onAfterRender = (renderer) => renderer.clearStencil();

    this.pivot.rotation.set(0, Math.PI / 2, 0);
    this.pivot.add(this.visPlane, this.capMesh);
    this.pivot.visible = false;

    this.group.add(this.stencilGroup, this.pivot);
  }

  // ============= SceneObjectHandle =============

  public getSelectableObjects(): Object3D[] {
    return this.pivot.visible && this._visible ? [this.visPlane] : [];
  }

  public getTransformTarget(): Object3D {
    return this.pivot;
  }

  public getSceneRoot(): Object3D {
    return this.group;
  }

  public getProperties(): CrossSectionPlaneProperties {
    return {
      type: "cross-section-plane",
      positionX: Math.round(this.pivot.position.x * 100) / 100,
      positionY: Math.round(this.pivot.position.y * 100) / 100,
      positionZ: Math.round(this.pivot.position.z * 100) / 100,
      rotationX: Math.round(this.pivot.rotation.x * (180 / Math.PI) * 10) / 10,
      rotationY: Math.round(this.pivot.rotation.y * (180 / Math.PI) * 10) / 10,
      rotationZ: Math.round(this.pivot.rotation.z * (180 / Math.PI) * 10) / 10,
    };
  }

  public setProperty(key: string, value: number): void {
    const toRad = (deg: number) => deg * (Math.PI / 180);
    switch (key) {
      case "positionX":
        this.pivot.position.x = value;
        break;
      case "positionY":
        this.pivot.position.y = value;
        break;
      case "positionZ":
        this.pivot.position.z = value;
        break;
      case "rotationX":
        this.pivot.rotation.x = toRad(value);
        break;
      case "rotationY":
        this.pivot.rotation.y = toRad(value);
        break;
      case "rotationZ":
        this.pivot.rotation.z = toRad(value);
        break;
    }
  }

  public setSelected(selected: boolean): void {
    (this.visPlane.material as MeshBasicMaterial).opacity = selected
      ? OPACITY_SELECTED
      : OPACITY_DESELECTED;
  }

  public get visible(): boolean {
    return this._visible;
  }

  public setVisible(visible: boolean): void {
    this._visible = visible;
    this.visPlane.visible = visible;
  }

  public get active(): boolean {
    return this._active;
  }

  public setActive(active: boolean): void {
    this._active = active;
    this.capMesh.visible = active;
    this.stencilGroup.visible = active && this.pivot.visible;
  }

  // ============= Cross-section specific =============

  public enable(modelGroup: Group): void {
    this.pivot.visible = true;
    this.visPlane.visible = this._visible;
    this.capMesh.visible = this._active;
    this.stencilGroup.visible = this._active;
    this.modelBox.setFromObject(modelGroup);
    this.updateVisPlaneSize();
    this.rebuildStencilMeshes(modelGroup);
  }

  public disable(): void {
    this.pivot.visible = false;
    this.stencilGroup.visible = false;
    this.clearStencilMeshes();
  }

  public rebuildForModel(modelGroup: Group): void {
    if (!this.pivot.visible) return;
    this.modelBox.setFromObject(modelGroup);
    this.updateVisPlaneSize();
    this.rebuildStencilMeshes(modelGroup);
  }

  /** Called by Stage whenever the set of active rigs changes. */
  public setTierIndex(index: number): void {
    this.tierIndex = index;
    this.capMesh.renderOrder = TIER * (index + 1) + 1;
    this.stencilGroup.traverse((child) => {
      if (child instanceof Mesh) child.renderOrder = TIER * (index + 1);
    });
  }

  /** Called by Stage so caps don't bleed outside regions cut by sibling planes. */
  public setCapClippingPlanes(planes: Plane[]): void {
    const mat = this.capMesh.material as MeshStandardMaterial;
    mat.clippingPlanes = planes;
    mat.needsUpdate = true;
  }

  /** Called every animation frame to sync the THREE.Plane from the pivot. */
  public update(): void {
    if (!this.pivot.visible) return;
    this.pivot.updateMatrixWorld(true);
    const normal = new Vector3(0, 0, -1)
      .applyQuaternion(this.pivot.quaternion)
      .normalize();
    this.plane.setFromNormalAndCoplanarPoint(normal, this.pivot.position);
    this.updateVisPlaneSize();
  }

  /**
   * Returns true if the rig consumed the click (hit the vis plane).
   * Pass gizmoJustInteracted=true to skip deselection when a gizmo handle
   * was just dragged — Stage tracks this via TransformControls events.
   */
  public hitTest(
    ndc: Vector2,
    camera: Parameters<Raycaster["setFromCamera"]>[1],
    gizmoJustInteracted: boolean,
  ): "hit" | "miss" | "gizmo" {
    if (!this.pivot.visible || !this._visible) return "miss";
    if (gizmoJustInteracted) return "gizmo";

    this.raycaster.setFromCamera(ndc, camera);
    const hits = this.raycaster.intersectObject(this.visPlane, false);
    return hits.length > 0 ? "hit" : "miss";
  }

  public snapRotation(snap: number): void {
    this.pivot.rotation.x = Math.round(this.pivot.rotation.x / snap) * snap;
    this.pivot.rotation.y = Math.round(this.pivot.rotation.y / snap) * snap;
    this.pivot.rotation.z = Math.round(this.pivot.rotation.z / snap) * snap;
  }

  public resize(width: number, height: number): void {
    (this.visOutline.material as LineMaterial).resolution.set(width, height);
  }

  public setTheme(theme: Theme): void {
    (this.capMesh.material as MeshStandardMaterial).color.copy(theme.accent);
    (this.visPlane.material as MeshBasicMaterial).color.copy(theme.accent);
    (this.visOutline.material as LineMaterial).color.copy(theme.accent);
  }

  public dispose(): void {
    this.clearStencilMeshes();
    this.capGeometry.dispose();
    (this.capMesh.material as MeshStandardMaterial).dispose();
    this.visGeometry.dispose();
    (this.visPlane.material as MeshBasicMaterial).dispose();
    this.visOutlineGeometry.dispose();
    (this.visOutline.material as LineMaterial).dispose();
  }

  // ============= Private helpers =============

  private updateVisPlaneSize(): void {
    if (this.modelBox.isEmpty()) return;

    this.pivot.updateMatrixWorld(true);
    const u = new Vector3(1, 0, 0).applyQuaternion(this.pivot.quaternion);
    const v = new Vector3(0, 1, 0).applyQuaternion(this.pivot.quaternion);

    const { min, max } = this.modelBox;
    let minU = Infinity,
      maxU = -Infinity;
    let minV = Infinity,
      maxV = -Infinity;

    for (let i = 0; i < 8; i++) {
      const corner = new Vector3(
        i & 1 ? max.x : min.x,
        i & 2 ? max.y : min.y,
        i & 4 ? max.z : min.z,
      );
      minU = Math.min(minU, corner.dot(u));
      maxU = Math.max(maxU, corner.dot(u));
      minV = Math.min(minV, corner.dot(v));
      maxV = Math.max(maxV, corner.dot(v));
    }

    this.visPlane.scale.set(
      maxU - minU + VIS_PLANE_PADDING * 2,
      maxV - minV + VIS_PLANE_PADDING * 2,
      1,
    );
    this.visPlane.position.set(
      (minU + maxU) / 2 - this.pivot.position.dot(u),
      (minV + maxV) / 2 - this.pivot.position.dot(v),
      0,
    );
  }

  private rebuildStencilMeshes(modelGroup: Group): void {
    this.clearStencilMeshes();
    modelGroup.updateMatrixWorld(true);

    modelGroup.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const clippingPlanes = [this.plane];

      const backMat = new MeshBasicMaterial({
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        colorWrite: false,
        stencilWrite: true,
        stencilFunc: AlwaysStencilFunc,
        stencilFail: IncrementWrapStencilOp,
        stencilZFail: IncrementWrapStencilOp,
        stencilZPass: IncrementWrapStencilOp,
        clippingPlanes,
      });

      const frontMat = new MeshBasicMaterial({
        side: FrontSide,
        depthWrite: false,
        depthTest: false,
        colorWrite: false,
        stencilWrite: true,
        stencilFunc: AlwaysStencilFunc,
        stencilFail: DecrementWrapStencilOp,
        stencilZFail: DecrementWrapStencilOp,
        stencilZPass: DecrementWrapStencilOp,
        clippingPlanes,
      });

      for (const mat of [backMat, frontMat]) {
        const stencilMesh = new Mesh(child.geometry, mat);
        stencilMesh.renderOrder = TIER * (this.tierIndex + 1);
        stencilMesh.matrixAutoUpdate = false;
        stencilMesh.matrix.copy(child.matrixWorld);
        this.stencilGroup.add(stencilMesh);
      }
    });
  }

  private clearStencilMeshes(): void {
    this.stencilGroup.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.geometry.dispose();
      (child.material as Material).dispose();
    });
    this.stencilGroup.clear();
  }
}
