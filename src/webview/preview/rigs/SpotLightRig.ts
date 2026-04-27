import { Color, Object3D, SpotLight } from "three";
import { SpotLightProperties } from "../../contexts/SelectedObjectContext";
import { LightRig } from "./LightRig";

export class SpotLightRig extends LightRig {
  public readonly id: string;
  public readonly light: SpotLight;

  constructor(
    id: string,
    intensity: number,
    x: number,
    y: number,
    z: number,
    angle: number,
    penumbra: number,
    color: Color,
  ) {
    super("light-spot", color);
    this.id = id;
    this.light = new SpotLight(0xffffff, intensity, 0, angle, penumbra, 0);
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

  public getProperties(): SpotLightProperties {
    return {
      type: "spot-light",
      intensity: Math.round(this.light.intensity * 100) / 100,
      positionX: Math.round(this.light.position.x * 100) / 100,
      positionY: Math.round(this.light.position.y * 100) / 100,
      positionZ: Math.round(this.light.position.z * 100) / 100,
      angle: Math.round(this.light.angle * (180 / Math.PI) * 10) / 10,
      penumbra: Math.round(this.light.penumbra * 100) / 100,
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
      case "angle":
        this.light.angle = value * (Math.PI / 180);
        break;
      case "penumbra":
        this.light.penumbra = value;
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
