import { Color, DirectionalLight, Object3D } from "three";
import { DirectionalLightProperties } from "../../contexts/SelectedObjectContext";
import { LightRig } from "./LightRig";

export class DirectionalLightRig extends LightRig {
  public readonly id: string;
  public readonly light: DirectionalLight;

  constructor(
    id: string,
    intensity: number,
    x: number,
    y: number,
    z: number,
    color: Color,
  ) {
    super("light-directional", color);
    this.id = id;
    this.light = new DirectionalLight(0xffffff, intensity);
    this.light.position.set(x, y, z);
    this.light.castShadow = true;
    this.light.add(this.iconObject);
    this.light.add(this.hitMesh);
  }

  public getTransformTarget(): Object3D {
    return this.light;
  }

  public getSceneRoot(): Object3D {
    return this.light;
  }

  public getProperties(): DirectionalLightProperties {
    return {
      type: "directional-light",
      intensity: Math.round(this.light.intensity * 100) / 100,
      positionX: Math.round(this.light.position.x * 100) / 100,
      positionY: Math.round(this.light.position.y * 100) / 100,
      positionZ: Math.round(this.light.position.z * 100) / 100,
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
    }
  }

  override get active(): boolean {
    return this.light.visible;
  }
  override setActive(active: boolean): void {
    this.light.visible = active;
  }
}
