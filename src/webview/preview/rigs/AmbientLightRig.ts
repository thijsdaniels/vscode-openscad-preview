import { AmbientLight, Object3D } from "three";
import { AmbientLightProperties } from "../../contexts/SelectedObjectContext";
import { Rig } from "./Rig";

export class AmbientLightRig extends Rig {
  public readonly id: string;
  public readonly light: AmbientLight;
  private _visible = true;

  constructor(id: string, intensity: number) {
    super();
    this.id = id;
    this.light = new AmbientLight(0xffffff, intensity);
  }

  override get supportsTransform(): boolean { return false; }

  public getSelectableObjects(): Object3D[] { return []; }
  public getTransformTarget(): Object3D { return this.light; }
  public getSceneRoot(): Object3D { return this.light; }

  public getProperties(): AmbientLightProperties {
    return {
      type: "ambient-light",
      intensity: Math.round(this.light.intensity * 100) / 100,
    };
  }

  public setProperty(key: string, value: number): void {
    if (key === "intensity") this.light.intensity = value;
  }

  public setSelected(_selected: boolean): void {}

  public get visible(): boolean { return this._visible; }
  public setVisible(visible: boolean): void { this._visible = visible; }

  override get active(): boolean { return this.light.visible; }
  override setActive(active: boolean): void { this.light.visible = active; }

  public dispose(): void {}
}
