import { Color, Object3D, PointLight } from "three";
import { PointLightProperties } from "../../contexts/SelectedObjectContext";
import { LightRig } from "./LightRig";

export class PointLightRig extends LightRig {
  public readonly id: string;
  public readonly light: PointLight;

  constructor(
    id: string,
    intensity: number,
    x: number,
    y: number,
    z: number,
    decay: number,
    color: Color,
  ) {
    super("light-point", color);
    this.id = id;
    this.light = new PointLight(0xffffff, intensity, 0, decay);
    this.light.position.set(x, y, z);
    this.light.add(this.iconObject);
    this.light.add(this.hitMesh);
  }

  public getTransformTarget(): Object3D {
    return this.light;
  }

  public getSceneRoot(): Object3D {
    return this.light;
  }

  public getProperties(): PointLightProperties {
    return {
      type: "point-light",
      intensity: Math.round(this.light.intensity * 100) / 100,
      positionX: Math.round(this.light.position.x * 100) / 100,
      positionY: Math.round(this.light.position.y * 100) / 100,
      positionZ: Math.round(this.light.position.z * 100) / 100,
      decay: Math.round(this.light.decay * 100) / 100,
    };
  }

  public setProperty(key: string, value: number): void {
    switch (key) {
      case "intensity":
        this.light.intensity = value;
        break;
      case "positionX":
        this.light.position.x = value;
        break;
      case "positionY":
        this.light.position.y = value;
        break;
      case "positionZ":
        this.light.position.z = value;
        break;
      case "decay":
        this.light.decay = value;
        break;
    }
  }

  override get active(): boolean {
    return this.light.visible;
  }
  override setActive(active: boolean): void {
    this.light.visible = active;
  }
}
