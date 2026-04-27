import {
  AxesHelper,
  Camera,
  CanvasTexture,
  PerspectiveCamera,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from "three";

export class AxesWidget {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;

  constructor(container: HTMLElement) {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(50, 1, 0.1, 100);
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });

    this.initRenderer(container);
    this.initAxes();
  }

  private initRenderer(container: HTMLElement) {
    this.renderer.setSize(96, 96);
    this.renderer.domElement.style.position = "absolute";
    this.renderer.domElement.style.bottom = "1rem";
    this.renderer.domElement.style.right = "1rem";
    container.appendChild(this.renderer.domElement);
  }

  private initAxes() {
    const axesHelper = new AxesHelper(2);
    this.scene.add(axesHelper);

    this.addLabel("X", new Vector3(2.5, 0, 0), "#ff3333");
    this.addLabel("Y", new Vector3(0, 2.5, 0), "#33cc44");
    this.addLabel("Z", new Vector3(0, 0, 2.5), "#3333ff");
  }

  private addLabel(text: string, position: Vector3, color: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 32, 32);

    const texture = new CanvasTexture(canvas);
    const material = new SpriteMaterial({ map: texture });
    const sprite = new Sprite(material);
    sprite.position.copy(position);
    this.scene.add(sprite);
  }

  update(mainCamera: Camera) {
    const distance = 7;
    const direction = new Vector3(0, 0, 1);
    direction.applyQuaternion(mainCamera.quaternion);

    this.camera.position.copy(direction.multiplyScalar(distance));
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
