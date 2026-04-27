import { Color, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { Theme } from "../Stage";
import fragmentShader from "./InfiniteGrid.frag.glsl";
import vertexShader from "./InfiniteGrid.vert.glsl";

export class InfiniteGrid {
  public readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  constructor(theme: Theme) {
    // Small unit plane — scaled up each frame to match the fade distance.
    // PlaneGeometry is natively in XY with normal +Z, which is the floor under Z-up.
    const geometry = new PlaneGeometry(2, 2);

    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uFadeFar: { value: 10000 },
        uGridColor: { value: new Color(theme.grid) },
        uAxisXColor: { value: new Color(0xff3333) },
        uAxisYColor: { value: new Color(0x33cc44) },
      },
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 4,
      polygonOffsetUnits: 16,
      side: DoubleSide,
    });

    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  /** Call every frame from the animation loop. */
  update(orbitDistance: number) {
    const fadeFar = Math.max(orbitDistance * 5, 100);
    this.material.uniforms.uFadeFar.value = fadeFar;
    this.mesh.scale.setScalar(fadeFar * 2);
  }

  setTheme(theme: Theme) {
    this.material.uniforms.uGridColor.value.set(theme.grid);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
