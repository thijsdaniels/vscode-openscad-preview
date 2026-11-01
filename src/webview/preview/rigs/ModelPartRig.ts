import {
  Box3,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  Object3D,
  Plane,
  Quaternion,
  Vector3,
} from "three";
import { ModelPartProperties } from "../../contexts/SelectedObjectContext";
import { Rig } from "./Rig";

// Edges sharper than this get outlined when the part is selected.
const OUTLINE_THRESHOLD_ANGLE = 30;
// Share of the accent colour added as emissive glow on the selected part.
const SELECTED_TINT = 0.35;

/** Inspection transform of a part, kept across reloads of the same model. */
export interface ModelPartPose {
  position: Vector3;
  quaternion: Quaternion;
}

/**
 * One top-level object of the rendered model (a 3MF build item, or the whole
 * STL). The part is re-parented under a pivot placed at its bounding-box
 * centre, so the gizmo turns it around its own centre. Moving it is purely
 * visual: the rig is rebuilt from the file at every render.
 *
 * The selection outline lives outside the model group (`outline`, added to the
 * scene by Stage) so the X-ray pass and cross-section stencils never see it.
 */
export class ModelPartRig extends Rig {
  readonly id: string;
  readonly name: string;
  readonly pivot = new Group();
  readonly outline = new Group();

  private meshes: Mesh[] = [];
  private materials: Material[] = [];
  private outlineMaterial: LineBasicMaterial;
  private outlineBuilt = false;
  private accent: Color;
  private size = new Vector3();
  private triangles = 0;
  private colors: string[];
  private selected = false;
  private _visible = true;

  constructor(id: string, name: string, part: Object3D, accent: Color) {
    super();
    this.id = id;
    this.name = name;
    this.accent = accent.clone();

    part.updateMatrixWorld(true);
    const box = new Box3().setFromObject(part);
    const center = box.isEmpty() ? new Vector3() : box.getCenter(new Vector3());
    if (!box.isEmpty()) box.getSize(this.size);

    // The part's parent has an identity transform: shifting it by -centre
    // under a pivot at +centre, in its place, leaves it where it was.
    const parent = part.parent;
    this.pivot.name = `ModelPartRig:${id}`;
    this.pivot.position.copy(center);
    part.position.sub(center);
    this.pivot.add(part);
    parent?.add(this.pivot);

    const colors = new Set<string>();
    part.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      // 3MF materials are shared between objects of the same colour: give
      // each part its own copies so the selection tint stays on this part.
      child.material = Array.isArray(child.material)
        ? child.material.map((m) => this.ownMaterial(m))
        : this.ownMaterial(child.material);
      for (const mat of this.materialsOf(child)) {
        if ("color" in mat && mat.color instanceof Color) {
          colors.add(`#${mat.color.getHexString()}`);
        }
      }
      const geometry = child.geometry;
      this.triangles += Math.floor(
        (geometry.index ?? geometry.attributes.position).count / 3,
      );
      this.meshes.push(child);
    });
    this.colors = [...colors];

    this.outlineMaterial = new LineBasicMaterial({ color: this.accent });
    this.outline.name = `ModelPartOutline:${id}`;
    this.outline.visible = false;
  }

  // ============= Rig =============

  getSelectableObjects(): Object3D[] {
    return this._visible ? this.meshes : [];
  }

  getTransformTarget(): Object3D {
    return this.pivot;
  }

  getSceneRoot(): Object3D {
    return this.pivot;
  }

  getProperties(): ModelPartProperties {
    const round = (v: number, f: number) => Math.round(v * f) / f;
    const toDeg = 180 / Math.PI;
    return {
      type: "model-part",
      name: this.name,
      colors: this.colors,
      sizeX: round(this.size.x, 100),
      sizeY: round(this.size.y, 100),
      sizeZ: round(this.size.z, 100),
      triangles: this.triangles,
      positionX: round(this.pivot.position.x, 100),
      positionY: round(this.pivot.position.y, 100),
      positionZ: round(this.pivot.position.z, 100),
      rotationX: round(this.pivot.rotation.x * toDeg, 10),
      rotationY: round(this.pivot.rotation.y * toDeg, 10),
      rotationZ: round(this.pivot.rotation.z * toDeg, 10),
    };
  }

  setProperty(key: string, value: number): void {
    const toRad = Math.PI / 180;
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
        this.pivot.rotation.x = value * toRad;
        break;
      case "rotationY":
        this.pivot.rotation.y = value * toRad;
        break;
      case "rotationZ":
        this.pivot.rotation.z = value * toRad;
        break;
    }
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    if (selected) this.buildOutline();
    const tint = selected
      ? this.accent.clone().multiplyScalar(SELECTED_TINT)
      : new Color(0, 0, 0);
    for (const mat of this.materials) {
      if ("emissive" in mat && mat.emissive instanceof Color) {
        mat.emissive.copy(tint);
      }
    }
    this.syncOutline();
  }

  get visible(): boolean {
    return this._visible;
  }

  setVisible(visible: boolean): void {
    this._visible = visible;
    this.pivot.visible = visible;
    this.syncOutline();
  }

  override update(): void {
    if (!this.outline.visible) return;
    // Follow the gizmo: copy each mesh's world matrix onto its outline.
    this.outline.children.forEach((line, i) => {
      line.matrix.copy(this.meshes[i].matrixWorld);
    });
  }

  dispose(): void {
    this.outline.removeFromParent();
    this.outline.children.forEach((line) => {
      (line as LineSegments).geometry.dispose();
    });
    this.outlineMaterial.dispose();
    this.materials.forEach((m) => m.dispose());
  }

  // ============= Model-part specific =============

  /** Cross-section planes clip the outline like they clip the part. */
  public setClippingPlanes(planes: Plane[]): void {
    this.outlineMaterial.clippingPlanes = planes;
    this.outlineMaterial.needsUpdate = true;
  }

  public getPose(): ModelPartPose {
    return {
      position: this.pivot.position.clone(),
      quaternion: this.pivot.quaternion.clone(),
    };
  }

  public setPose(pose: ModelPartPose): void {
    this.pivot.position.copy(pose.position);
    this.pivot.quaternion.copy(pose.quaternion);
  }

  private ownMaterial(material: Material): Material {
    const copy = material.clone();
    this.materials.push(copy);
    return copy;
  }

  private materialsOf(mesh: Mesh): Material[] {
    return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  }

  /** Edge outline, built on first selection only (costly on big meshes). */
  private buildOutline(): void {
    if (this.outlineBuilt) return;
    this.outlineBuilt = true;
    for (const mesh of this.meshes) {
      const line = new LineSegments(
        new EdgesGeometry(mesh.geometry, OUTLINE_THRESHOLD_ANGLE),
        this.outlineMaterial,
      );
      line.matrixAutoUpdate = false;
      line.raycast = () => {};
      this.outline.add(line);
    }
  }

  private syncOutline(): void {
    this.outline.visible = this.selected && this._visible;
    this.update();
  }
}
