import { OrthographicCamera, PerspectiveCamera } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CameraMode } from "../../contexts/ViewSettingsContext";

export class CameraRig {
  private persCamera: PerspectiveCamera;
  private orthCamera: OrthographicCamera;
  private controls: OrbitControls;
  public activeCamera: PerspectiveCamera | OrthographicCamera;
  private isOrthographic = false;

  constructor(width: number, height: number, domElement: HTMLElement) {
    this.persCamera = new PerspectiveCamera(
      75,
      width / (height || 1),
      0.1,
      10000,
    );
    this.persCamera.position.set(0, 100, 200);

    const aspect = width / (height || 1);
    const viewSize = 100;
    this.orthCamera = new OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize,
      0.1,
      10000,
    );

    this.activeCamera = this.persCamera;

    this.syncCameras();

    this.controls = new OrbitControls(this.persCamera, domElement);
    this.controls.zoomSpeed = 0.5;
    this.controls.addEventListener("change", () => this.syncCameras());
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public getPerspectiveCamera(): PerspectiveCamera {
    return this.persCamera;
  }

  public setMode(mode: CameraMode) {
    this.activeCamera =
      mode === CameraMode.Orthographic ? this.orthCamera : this.persCamera;
    this.isOrthographic = mode === CameraMode.Orthographic;
  }

  public update() {
    this.controls.update();
  }

  public resize(width: number, height: number) {
    this.persCamera.aspect = width / height;
    this.persCamera.updateProjectionMatrix();

    const viewSize = 100;
    this.orthCamera.left = -viewSize * (width / height);
    this.orthCamera.right = viewSize * (width / height);
    this.orthCamera.top = viewSize;
    this.orthCamera.bottom = -viewSize;
    this.orthCamera.updateProjectionMatrix();
  }

  private syncCameras() {
    this.orthCamera.position.copy(this.persCamera.position);
    this.orthCamera.quaternion.copy(this.persCamera.quaternion);
    this.orthCamera.updateProjectionMatrix();
  }
}
