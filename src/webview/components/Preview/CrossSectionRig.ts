import {
  AlwaysStencilFunc,
  BackSide,
  Box3,
  Camera,
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
  PerspectiveCamera,
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
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { Theme } from "./Stage";

// The cap renders just after stencil writes, model renders after cap.
const STENCIL_RENDER_ORDER = 1;
const CAP_RENDER_ORDER = 1.1;
const MODEL_RENDER_ORDER = 2;

const CAP_SIZE = 9999;

const VIS_PLANE_PADDING = 10;

const OPACITY_DESELECTED = 0.05;
const OPACITY_SELECTED = 0.15;

// Snap translation to 1mm (one Three.js unit = 1mm in OpenSCAD), rotate to 5°.
// Applied only when Ctrl is held — null means no snap.
const TRANSLATION_SNAP = 1;
const ROTATION_SNAP = Math.PI / 36;

export class CrossSectionRig {
  public readonly group = new Group();
  public readonly plane = new Plane();
  public readonly transformControls: TransformControls;

  private pivot = new Object3D();
  private visPlane: Mesh;
  private visGeometry = new PlaneGeometry(1, 1);
  private visOutline: Line2;
  private visOutlineGeometry = new LineGeometry().setPositions([
    -0.5, -0.5, 0,
     0.5, -0.5, 0,
     0.5,  0.5, 0,
    -0.5,  0.5, 0,
    -0.5, -0.5, 0, // close the loop
  ]);
  private capMesh: Mesh;
  private capGeometry = new PlaneGeometry(CAP_SIZE, CAP_SIZE);
  private stencilGroup = new Group();

  private modelBox = new Box3();
  private enabled = false;
  private selected = false;
  private snapEnabled = false;
  // Set to true when the gizmo handles a mouseDown; cleared after click fires.
  private gizmoJustInteracted = false;
  private raycaster = new Raycaster();

  constructor(
    controlCamera: PerspectiveCamera,
    domElement: HTMLElement,
    accentColor: Color,
  ) {
    // Visual plane — semi-transparent, clickable, follows pivot
    const visMat = new MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: OPACITY_DESELECTED,
      side: DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.visPlane = new Mesh(this.visGeometry, visMat);

    // Outline — fully opaque Line2, child of visPlane so it inherits scale/position.
    const outlineMat = new LineMaterial({ color: accentColor, linewidth: 2, fog: false, depthTest: false });
    this.visOutline = new Line2(this.visOutlineGeometry, outlineMat);
    this.visOutline.computeLineDistances();
    this.visOutline.renderOrder = MODEL_RENDER_ORDER + 1;
    this.visPlane.add(this.visOutline);

    // Cap — standard material so it receives scene lighting.
    const capMat = new MeshStandardMaterial({
      color: accentColor,
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
    this.capMesh.renderOrder = CAP_RENDER_ORDER;
    this.capMesh.onAfterRender = (renderer) => renderer.clearStencil();

    this.pivot.rotation.set(0, Math.PI / 2, 0); // initial vertical cut along YZ plane
    this.pivot.add(this.visPlane, this.capMesh);
    this.pivot.visible = false;

    // TransformControls — attached to pivot when the plane is selected.
    // The controls themselves are not an Object3D; getHelper() returns the
    // visual root that must be added to the scene.
    // Snapping is off by default and enabled only while Ctrl is held (setSnap).
    this.transformControls = new TransformControls(controlCamera, domElement);

    // Track gizmo pointer interactions so handleClick can skip deselection.
    // The invisible hit meshes on the gizmo cover a large area, so raycasting
    // against them in handleClick produces too many false positives.
    this.transformControls.addEventListener("mouseDown", () => {
      this.gizmoJustInteracted = true;
    });
    this.transformControls.addEventListener("mouseUp", () => {
      // When snap is on and the user just rotated, snap the resulting Euler
      // angles to absolute world-space multiples. TransformControls' built-in
      // rotationSnap measures relative to the gesture start, so we handle
      // rotation snap here instead to guarantee absolute alignment.
      if (this.snapEnabled && this.transformControls.mode === "rotate") {
        const snap = ROTATION_SNAP;
        this.pivot.rotation.x = Math.round(this.pivot.rotation.x / snap) * snap;
        this.pivot.rotation.y = Math.round(this.pivot.rotation.y / snap) * snap;
        this.pivot.rotation.z = Math.round(this.pivot.rotation.z / snap) * snap;
      }

      // The browser fires `click` synchronously after `pointerup` before
      // setTimeout callbacks, so deferring keeps the flag set during the click.
      setTimeout(() => {
        this.gizmoJustInteracted = false;
      }, 0);
    });

    this.group.add(
      this.stencilGroup,
      this.pivot,
      this.transformControls.getHelper(),
    );
  }

  // Enable or disable the cross-section entirely.
  public setEnabled(enabled: boolean, modelGroup: Group): void {
    this.enabled = enabled;

    if (!enabled) {
      this.deselect();
      this.pivot.visible = false;
      this.clearStencilMeshes();
      this.clearModelClip(modelGroup);
      this.resetModelRenderOrder(modelGroup);
      return;
    }

    this.pivot.visible = true;
    this.modelBox.setFromObject(modelGroup);
    this.updateVisPlaneSize();
    this.rebuildStencilMeshes(modelGroup);
    this.applyModelClip(modelGroup);
    this.setModelRenderOrder(modelGroup);
  }

  // Called after the model group changes. Rebuilds stencil meshes to keep the
  // cross-section in sync with updated geometry. The pivot position and rotation
  // are never reset here — the user's placement is always preserved.
  public rebuildForModel(modelGroup: Group): void {
    if (!this.enabled) return;

    this.modelBox.setFromObject(modelGroup);
    this.updateVisPlaneSize();
    this.rebuildStencilMeshes(modelGroup);
    this.applyModelClip(modelGroup);
    this.setModelRenderOrder(modelGroup);
  }

  // Projects the model bounding box onto the pivot's local U/V axes to size
  // the visPlane. Orientation-dependent only — translating the pivot along its
  // normal does not change the projection extents.
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
      const du = corner.dot(u);
      const dv = corner.dot(v);
      minU = Math.min(minU, du);
      maxU = Math.max(maxU, du);
      minV = Math.min(minV, dv);
      maxV = Math.max(maxV, dv);
    }

    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;
    this.visPlane.scale.set(
      maxU - minU + VIS_PLANE_PADDING * 2,
      maxV - minV + VIS_PLANE_PADDING * 2,
      1,
    );
    this.visPlane.position.set(
      centerU - this.pivot.position.dot(u),
      centerV - this.pivot.position.dot(v),
      0,
    );
  }

  // Called every animation frame to sync the THREE.Plane from the pivot transform.
  public update(): void {
    if (!this.enabled) return;

    this.pivot.updateMatrixWorld(true);
    const normal = new Vector3(0, 0, -1)
      .applyQuaternion(this.pivot.quaternion)
      .normalize();
    this.plane.setFromNormalAndCoplanarPoint(normal, this.pivot.position);
    this.updateVisPlaneSize();
  }

  // Returns true if the rig consumed the click.
  // A gizmo mouseDown sets gizmoJustInteracted so we don't deselect when the
  // user operates a handle (the invisible hit meshes on the gizmo are large,
  // so raycasting against them produces too many false positives).
  public handleClick(ndc: Vector2, camera: Camera): boolean {
    if (!this.enabled) return false;

    if (this.gizmoJustInteracted) return true;

    this.raycaster.setFromCamera(ndc, camera);
    const hits = this.raycaster.intersectObject(this.visPlane, false);
    if (hits.length > 0) {
      this.select();
      return true;
    }

    this.deselect();
    return false;
  }

  // Enable or disable Ctrl-snap. Called from Stage on pointer move (via e.ctrlKey).
  // Translation uses TransformControls' built-in grid snap (absolute, world-space).
  // Rotation uses the built-in snap for live feedback during the drag (relative to
  // the gesture start), then snaps to absolute world-space Euler angles on release.
  public setSnap(enabled: boolean): void {
    this.snapEnabled = enabled;
    this.transformControls.setTranslationSnap(
      enabled ? TRANSLATION_SNAP : null,
    );
    this.transformControls.setRotationSnap(enabled ? ROTATION_SNAP : null);
  }

  public select(): void {
    if (this.selected) return;
    this.selected = true;
    (this.visPlane.material as MeshBasicMaterial).opacity = OPACITY_SELECTED;
    this.transformControls.attach(this.pivot);
    // attach() makes the helper visible internally
  }

  public deselect(): void {
    if (!this.selected) return;
    this.selected = false;
    (this.visPlane.material as MeshBasicMaterial).opacity = OPACITY_DESELECTED;
    this.transformControls.detach();
    // detach() hides the helper internally
  }

  public setTransformMode(mode: "translate" | "rotate"): void {
    this.transformControls.setMode(mode);
  }

  public resize(width: number, height: number): void {
    (this.visOutline.material as LineMaterial).resolution.set(width, height);
  }

  public setTheme(theme: Theme): void {
    (this.capMesh.material as MeshStandardMaterial).color.copy(theme.accent);
    (this.visPlane.material as MeshBasicMaterial).color.copy(theme.accent);
    (this.visOutline.material as LineMaterial).color.copy(theme.accent);
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
        stencilMesh.renderOrder = STENCIL_RENDER_ORDER;
        stencilMesh.matrixAutoUpdate = false;
        stencilMesh.matrix.copy(child.matrixWorld);
        this.stencilGroup.add(stencilMesh);
      }
    });
  }

  private clearStencilMeshes(): void {
    this.stencilGroup.traverse((child) => {
      if (child instanceof Mesh) {
        (child.material as Material).dispose();
      }
    });
    this.stencilGroup.clear();
  }

  private applyModelClip(modelGroup: Group): void {
    modelGroup.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const mat of materials) {
        mat.clippingPlanes = [this.plane];
        mat.needsUpdate = true;
      }
    });
  }

  private clearModelClip(modelGroup: Group): void {
    modelGroup.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const mat of materials) {
        mat.clippingPlanes = [];
        mat.needsUpdate = true;
      }
    });
  }

  private setModelRenderOrder(modelGroup: Group): void {
    modelGroup.traverse((child) => {
      if (child instanceof Mesh) child.renderOrder = MODEL_RENDER_ORDER;
    });
  }

  private resetModelRenderOrder(modelGroup: Group): void {
    modelGroup.traverse((child) => {
      if (child instanceof Mesh) child.renderOrder = 0;
    });
  }

  public dispose(): void {
    this.clearStencilMeshes();
    this.capGeometry.dispose();
    (this.capMesh.material as MeshStandardMaterial).dispose();
    this.visGeometry.dispose();
    (this.visPlane.material as MeshBasicMaterial).dispose();
    this.visOutlineGeometry.dispose();
    (this.visOutline.material as LineMaterial).dispose();
    this.transformControls.dispose();
  }
}
