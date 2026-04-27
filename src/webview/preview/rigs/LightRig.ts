import {
  Color,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { IconName } from "../../components/atoms/Icon";
import { Rig } from "./Rig";

const HIT_RADIUS = 5;

/**
 * Base class for positional lights (directional, spot, point).
 * Manages a CSS2D icon gizmo and an invisible hit sphere for raycasting.
 * Subclasses own their Three.js light and property logic.
 */
export abstract class LightRig extends Rig {
  protected readonly iconObject: CSS2DObject;
  protected readonly hitMesh: Mesh;
  private _visible = true;
  private _selected = false;
  private color: Color;

  constructor(iconName: IconName, color: Color) {
    super();
    this.color = color;

    // CSS2D icon using <scad-icon> custom element
    const el = document.createElement("scad-icon");
    el.setAttribute("name", iconName);
    el.style.pointerEvents = "none";
    this.iconObject = new CSS2DObject(el);
    this.applyOpacity();

    // Invisible hit sphere for raycasting
    this.hitMesh = new Mesh(
      new SphereGeometry(HIT_RADIUS, 8, 8),
      new MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
      }),
    );
  }

  public getSelectableObjects(): Object3D[] {
    return this._visible ? [this.hitMesh] : [];
  }

  public setSelected(selected: boolean): void {
    this._selected = selected;
    this.applyOpacity();
  }

  public get visible(): boolean {
    return this._visible;
  }

  public setVisible(visible: boolean): void {
    this._visible = visible;
    this.iconObject.visible = visible;
    this.hitMesh.visible = visible;
  }

  public dispose(): void {
    this.iconObject.element.remove();
    this.hitMesh.geometry.dispose();
    (this.hitMesh.material as MeshBasicMaterial).dispose();
  }

  private applyOpacity(): void {
    const opacity = this._selected
      ? Rig.GIZMO_OPACITY_SELECTED
      : Rig.GIZMO_OPACITY_UNSELECTED;
    const hex = `#${this.color.getHexString()}`;
    this.iconObject.element.style.color = hex;
    this.iconObject.element.style.opacity = String(opacity);
  }
}
