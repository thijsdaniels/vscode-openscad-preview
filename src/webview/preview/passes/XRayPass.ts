import {
  AddEquation,
  Camera,
  Color,
  CustomBlending,
  DoubleSide,
  FloatType,
  Group,
  Mesh,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  Plane,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";

const thicknessVert = /* glsl */ `
#include <clipping_planes_pars_vertex>
varying float vDepth;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}
`;

// Front faces subtract their depth, back faces add — the per-pixel sum equals
// the total ray length that lay inside material, regardless of how many shells
// or concavities the ray crossed.
const thicknessFrag = /* glsl */ `
#include <clipping_planes_pars_fragment>
varying float vDepth;
void main() {
  #include <clipping_planes_fragment>
  float contrib = gl_FrontFacing ? -vDepth : vDepth;
  gl_FragColor = vec4(contrib, 0.0, 0.0, 1.0);
}
`;

const compositeVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`;

// Beer-Lambert: thicker material → more absorption → higher alpha. Density
// occludes the background proportionally instead of pure additive brightening.
const compositeFrag = /* glsl */ `
uniform sampler2D tThickness;
uniform vec3 uColor;
uniform float uAbsorption;
varying vec2 vUv;
void main() {
  float thickness = abs(texture2D(tThickness, vUv).r);
  float alpha = 1.0 - exp(-uAbsorption * thickness);
  gl_FragColor = vec4(uColor, alpha);
}
`;

export class XRayPass {
  private renderTarget: WebGLRenderTarget;
  private thicknessMaterial: ShaderMaterial;
  private compositeMaterial: ShaderMaterial;
  private compositeMesh: Mesh;
  private compositeScene: Scene;
  private compositeCamera: OrthographicCamera;

  constructor(width: number, height: number) {
    this.renderTarget = new WebGLRenderTarget(width, height, {
      type: FloatType,
      format: RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });

    this.thicknessMaterial = new ShaderMaterial({
      vertexShader: thicknessVert,
      fragmentShader: thicknessFrag,
      side: DoubleSide,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendEquationAlpha: AddEquation,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneFactor,
      clipping: true,
    });

    this.compositeMaterial = new ShaderMaterial({
      vertexShader: compositeVert,
      fragmentShader: compositeFrag,
      uniforms: {
        tThickness: { value: this.renderTarget.texture },
        uColor: { value: new Color(0xffffff) },
        uAbsorption: { value: 0.05 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.compositeCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.compositeMesh = new Mesh(new PlaneGeometry(1, 1), this.compositeMaterial);
    this.compositeMesh.frustumCulled = false;
    this.compositeScene = new Scene();
    this.compositeScene.add(this.compositeMesh);
  }

  public setSize(width: number, height: number) {
    this.renderTarget.setSize(width, height);
  }

  public setColor(color: Color) {
    (this.compositeMaterial.uniforms.uColor.value as Color).copy(color);
  }

  public setAbsorption(k: number) {
    this.compositeMaterial.uniforms.uAbsorption.value = k;
  }

  public setClippingPlanes(planes: Plane[]) {
    this.thicknessMaterial.clippingPlanes = planes.length > 0 ? [...planes] : null;
    this.thicknessMaterial.needsUpdate = true;
  }

  public render(renderer: WebGLRenderer, modelGroup: Group, camera: Camera) {
    // Pass 1: accumulate signed depth into the float RT. Walk the model once,
    // swap each mesh's material for the thickness shader, render the group,
    // then put the originals back. We don't use scene.overrideMaterial because
    // it would also override sibling objects in the scene.
    const restores: { mesh: Mesh; mat: Mesh["material"] }[] = [];
    modelGroup.traverse((obj) => {
      if (obj instanceof Mesh) {
        restores.push({ mesh: obj, mat: obj.material });
        obj.material = this.thicknessMaterial;
      }
    });

    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    const prevShadowEnabled = renderer.shadowMap.enabled;
    const prevClearColor = new Color();
    renderer.getClearColor(prevClearColor);
    const prevClearAlpha = renderer.getClearAlpha();

    renderer.shadowMap.enabled = false;
    renderer.setRenderTarget(this.renderTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.autoClear = false;
    renderer.render(modelGroup, camera);

    for (const r of restores) r.mesh.material = r.mat;

    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClearColor, prevClearAlpha);
    renderer.shadowMap.enabled = prevShadowEnabled;

    // Pass 2: composite the thickness texture onto the current framebuffer.
    // Don't clear — we're blending on top of the already-rendered environment.
    renderer.autoClear = false;
    renderer.render(this.compositeScene, this.compositeCamera);
    renderer.autoClear = prevAutoClear;
  }

  public dispose() {
    this.renderTarget.dispose();
    this.thicknessMaterial.dispose();
    this.compositeMaterial.dispose();
    this.compositeMesh.geometry.dispose();
  }
}
