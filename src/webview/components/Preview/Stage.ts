import {
  Color,
  FogExp2,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  WebGLRenderer,
} from "three";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ModelFormat } from "../../../shared/types/ModelFormat";
import { ModelContext } from "../../contexts/ModelContext";
import {
  Environment,
  ShadowMode,
  ViewSettingsContext,
} from "../../contexts/ViewSettingsContext";
import { AxesWidget } from "./AxesWidget";
import { CameraRig } from "./CameraRig";
import { EnvironmentRig } from "./EnvironmentRig";
import { LightRig } from "./LightRig";
import { MaterialManager } from "./MaterialManager";

export interface Theme {
  background: Color;
  gridMajor: Color;
  gridMinor: Color;
  fog: Color;
  plate: Color;
  plateGrid: Color;
  additive: Color;
  subtractive: Color;
}

export class Stage {
  private container: HTMLElement;
  private renderer: WebGLRenderer;
  private scene: Scene;

  private cameraRig: CameraRig;
  private lightRig: LightRig;
  private environmentRig: EnvironmentRig;
  private materialManager: MaterialManager;

  private modelGroup: Group;
  private axesWidget: AxesWidget;
  private viewSettings?: ViewSettingsContext;

  private animationFrameId: number | null = null;
  private theme: Theme;

  constructor(container: HTMLElement, theme: Theme) {
    this.container = container;
    this.theme = theme;

    // 1. Initialize core Three.js graph
    this.scene = new Scene();
    this.scene.background = this.theme.background;
    this.scene.fog = new FogExp2(this.theme.fog, 0.001);

    // 2. Initialize DOM Renderer
    const { clientWidth: width, clientHeight: height } = container;
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width || 1, height || 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.classList.add("main-canvas");
    this.container.appendChild(this.renderer.domElement);

    // 3. Initialize Domain Rigs
    this.cameraRig = new CameraRig(width, height, this.renderer.domElement);
    this.lightRig = new LightRig();
    this.scene.add(this.lightRig.group);
    this.environmentRig = new EnvironmentRig(Environment.None, this.theme);
    this.scene.add(this.environmentRig.group);
    this.materialManager = new MaterialManager();

    // 4. Initialize specialized widgets/groups
    this.modelGroup = new Group();
    this.scene.add(this.modelGroup);
    this.axesWidget = new AxesWidget(container);

    // 5. Kickoff
    this.startAnimationLoop();
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  public updateTheme(theme: Theme) {
    this.theme = theme;
    this.scene.background = theme.background;
    this.scene.fog = new FogExp2(theme.fog, 0.001);
    this.environmentRig.setTheme(theme);
  }

  public resize(width: number, height: number) {
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height);
    this.cameraRig.resize(width, height);
  }

  public applySettings(viewSettings: ViewSettingsContext) {
    this.viewSettings = viewSettings;

    this.environmentRig.setEnvironment(viewSettings.get("environment"));
    this.cameraRig.setMode(viewSettings.get("camera"));
    this.renderer.shadowMap.enabled = viewSettings.is("shadows", ShadowMode.On);
    this.materialManager.applyToGroup(this.modelGroup, viewSettings);
  }

  public loadModelData(modelState: ModelContext) {
    const { format, base64Data } = modelState;
    if (!base64Data || !format) return;

    const binaryString = window.atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    this.modelGroup.clear();

    if (format === ModelFormat.ThreeMF) {
      const loader = new ThreeMFLoader();
      try {
        const group = loader.parse(bytes.buffer);
        group.rotateX(-Math.PI / 2);

        group.traverse((child) => {
          if (child instanceof Mesh) {
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            materials.forEach((mat) => {
              if (mat.color) {
                const hex = mat.color.getHexString().toLowerCase();
                if (hex === "f9d72c") {
                  mat.color.copy(this.theme.additive);
                } else if (hex === "9dcb51") {
                  mat.color.copy(this.theme.subtractive);
                }
              }
            });

            if (!child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
            if (this.viewSettings) {
              // Ensure wireframes/colors are applied immediately to new payload
              this.materialManager.applyToGroup(group, this.viewSettings);
            }
          }
        });
        this.modelGroup.add(group);
      } catch (e) {
        console.error("Failed to parse 3MF:", e);
      }
    } else {
      const loader = new STLLoader();
      try {
        const geometry = loader.parse(bytes.buffer);
        geometry.rotateX(-Math.PI / 2);

        // STLs do not contain color data, so we initialize with a standard blank material
        const material = new MeshStandardMaterial({
          color: this.theme.additive,
          flatShading: false,
          fog: false,
        });

        const mesh = new Mesh(geometry, material);
        this.modelGroup.add(mesh);

        if (this.viewSettings) {
          this.materialManager.applyToGroup(this.modelGroup, this.viewSettings);
        }
      } catch (e) {
        console.error("Failed to parse STL:", e);
      }
    }
  }

  private startAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.startAnimationLoop);
    this.cameraRig.update();
    this.axesWidget.update(this.cameraRig.activeCamera);
    this.renderer.render(this.scene, this.cameraRig.activeCamera);
  };
}
