import {
  Color,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
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
import { SnappingMode } from "../../contexts/MeasurementContext";
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

  // Measurement tool properties
  private raycaster: Raycaster;
  private mouse: Vector2;
  private measurementEnabled: boolean = false;
  private onMeasurementHover:
    | ((point: { x: number; y: number; z: number } | null) => void)
    | null = null;
  private onMeasurementClick:
    | ((point: { x: number; y: number; z: number } | null) => void)
    | null = null;

  // Measurement visualization
  private measurementGroup: Group;
  private pointASphere: Mesh | null = null;
  private pointBSphere: Mesh | null = null;
  private hoveredSphere: Mesh | null = null;
  private sphereRadius: number = 1;
  private snappingMode: SnappingMode = SnappingMode.Vertex;
  private vertexSnappingRadius: number = 10; // pixels

  constructor(container: HTMLElement, theme: Theme) {
    this.container = container;
    this.theme = theme;

    // Initialize raycasting for measurement tool
    this.raycaster = new Raycaster();
    this.mouse = new Vector2();

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
    this.measurementGroup = new Group();
    this.scene.add(this.measurementGroup);
    this.axesWidget = new AxesWidget(container);

    // 5. Setup measurement tool event listeners
    this.setupMeasurementListeners();

    // 6. Kickoff
    this.startAnimationLoop();
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.renderer.domElement.removeEventListener(
      "mousemove",
      this.handleMouseMove,
    );
    this.renderer.domElement.removeEventListener(
      "click",
      this.handleMouseClick,
    );

    // Clean up measurement visualization
    this.measurementGroup.clear();

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
    // Render immediately to fill the canvas before the browser paints.
    // Changing canvas width/height attributes clears it, and the animation
    // loop only re-renders on the next RAF — causing a one-frame flicker.
    this.renderer.render(this.scene, this.cameraRig.activeCamera);
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

  // ============= Measurement Tool Methods =============

  private setupMeasurementListeners() {
    this.renderer.domElement.addEventListener(
      "mousemove",
      this.handleMouseMove,
    );
    this.renderer.domElement.addEventListener("click", this.handleMouseClick);
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.measurementEnabled) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const point = this.getMeasurementPoint();
    if (this.onMeasurementHover) {
      this.onMeasurementHover(point);
    }
  };

  private handleMouseClick = (event: MouseEvent) => {
    if (!this.measurementEnabled) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const point = this.getMeasurementPoint();
    if (this.onMeasurementClick) {
      this.onMeasurementClick(point);
    }
  };

  private getMeasurementPoint(): { x: number; y: number; z: number } | null {
    this.raycaster.setFromCamera(this.mouse, this.cameraRig.activeCamera);

    const intersects = this.raycaster.intersectObject(this.modelGroup, true);
    if (intersects.length === 0) {
      return null;
    }

    const intersection = intersects[0];
    const point = intersection.point;

    // Apply snapping based on mode
    let snappedPoint = point;

    if (
      this.snappingMode === SnappingMode.Vertex &&
      intersection.object instanceof Mesh
    ) {
      snappedPoint = this.snapToVertex(intersection.object, point);
    } else if (
      this.snappingMode === SnappingMode.Edge &&
      intersection.object instanceof Mesh
    ) {
      snappedPoint = this.snapToEdge(intersection.object, point);
    }
    // For Face mode, just use the intersection point

    // Return point in millimeters, rounded to 2 decimal places
    return {
      x: Math.round(snappedPoint.x * 100) / 100,
      y: Math.round(snappedPoint.y * 100) / 100,
      z: Math.round(snappedPoint.z * 100) / 100,
    };
  }

  private snapToVertex(mesh: Mesh, point: Vector3): Vector3 {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;

    if (!positions) {
      return point;
    }

    let closestVertex = point.clone();
    let closestDistance = Infinity;
    const worldMatrix = mesh.matrixWorld;

    for (let i = 0; i < positions.count; i++) {
      const vertex = new Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i),
      );
      vertex.applyMatrix4(worldMatrix);

      const distance = vertex.distanceTo(point);

      if (distance < closestDistance && distance < 5) {
        // 5 units snapping radius
        closestDistance = distance;
        closestVertex = vertex;
      }
    }

    return closestVertex;
  }

  private snapToEdge(mesh: Mesh, point: Vector3): Vector3 {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const indices = geometry.index;

    if (!positions) {
      return point;
    }

    let closestPoint = point.clone();
    let closestDistance = Infinity;
    const worldMatrix = mesh.matrixWorld;

    // If there's an index, use it; otherwise, create edges from consecutive vertices
    const edgeIndices: [number, number][] = [];

    if (indices) {
      // For indexed geometry, extract edges from faces
      const indexArray = indices.array as Uint32Array | Uint16Array;
      for (let i = 0; i < indexArray.length; i += 3) {
        // Each face has 3 vertices, create 3 edges
        edgeIndices.push([indexArray[i], indexArray[i + 1]]);
        edgeIndices.push([indexArray[i + 1], indexArray[i + 2]]);
        edgeIndices.push([indexArray[i + 2], indexArray[i]]);
      }
    } else {
      // For non-indexed geometry
      for (let i = 0; i < positions.count; i += 3) {
        edgeIndices.push([i, i + 1]);
        edgeIndices.push([i + 1, i + 2]);
        edgeIndices.push([i + 2, i]);
      }
    }

    // Find closest point on any edge
    for (const [i1, i2] of edgeIndices) {
      const v1 = new Vector3(
        positions.getX(i1),
        positions.getY(i1),
        positions.getZ(i1),
      ).applyMatrix4(worldMatrix);

      const v2 = new Vector3(
        positions.getX(i2),
        positions.getY(i2),
        positions.getZ(i2),
      ).applyMatrix4(worldMatrix);

      const edgePoint = this.closestPointOnLineSegment(v1, v2, point);
      const distance = edgePoint.distanceTo(point);

      if (distance < closestDistance && distance < 5) {
        // 5 units snapping radius
        closestDistance = distance;
        closestPoint = edgePoint;
      }
    }

    return closestPoint;
  }

  private closestPointOnLineSegment(
    a: Vector3,
    b: Vector3,
    p: Vector3,
  ): Vector3 {
    const pa = p.clone().sub(a);
    const ba = b.clone().sub(a);
    const t = Math.max(0, Math.min(1, pa.dot(ba) / ba.dot(ba)));
    return a.clone().add(ba.multiplyScalar(t));
  }

  public setMeasurementEnabled(enabled: boolean) {
    this.measurementEnabled = enabled;
  }

  public setMeasurementCallbacks(
    onHover:
      | ((point: { x: number; y: number; z: number } | null) => void)
      | null,
    onClick:
      | ((point: { x: number; y: number; z: number } | null) => void)
      | null,
  ) {
    this.onMeasurementHover = onHover;
    this.onMeasurementClick = onClick;
  }

  public setMeasurementSnappingMode(mode: SnappingMode) {
    this.snappingMode = mode;
  }

  public setMeasurementPointA(
    point: { x: number; y: number; z: number } | null,
  ) {
    if (!point) {
      if (this.pointASphere) {
        this.measurementGroup.remove(this.pointASphere);
        this.pointASphere = null;
      }
      return;
    }

    if (!this.pointASphere) {
      const geometry = new SphereGeometry(this.sphereRadius, 16, 16);
      const material = new MeshBasicMaterial({ color: 0xff0000 }); // Red
      this.pointASphere = new Mesh(geometry, material);
      this.measurementGroup.add(this.pointASphere);
    }

    this.pointASphere.position.set(point.x, point.y, point.z);
  }

  public setMeasurementPointB(
    point: { x: number; y: number; z: number } | null,
  ) {
    if (!point) {
      if (this.pointBSphere) {
        this.measurementGroup.remove(this.pointBSphere);
        this.pointBSphere = null;
      }
      return;
    }

    if (!this.pointBSphere) {
      const geometry = new SphereGeometry(this.sphereRadius, 16, 16);
      const material = new MeshBasicMaterial({ color: 0x00ff00 }); // Green
      this.pointBSphere = new Mesh(geometry, material);
      this.measurementGroup.add(this.pointBSphere);
    }

    this.pointBSphere.position.set(point.x, point.y, point.z);
  }

  public setMeasurementPointHovered(
    point: { x: number; y: number; z: number } | null,
  ) {
    if (!point) {
      if (this.hoveredSphere) {
        this.measurementGroup.remove(this.hoveredSphere);
        this.hoveredSphere = null;
      }
      return;
    }

    if (!this.hoveredSphere) {
      const geometry = new SphereGeometry(this.sphereRadius * 0.8, 16, 16);
      const material = new MeshBasicMaterial({
        color: 0xffff00,
        opacity: 0.6,
        transparent: true,
      }); // Yellow with transparency
      this.hoveredSphere = new Mesh(geometry, material);
      this.measurementGroup.add(this.hoveredSphere);
    }

    this.hoveredSphere.position.set(point.x, point.y, point.z);
  }
}
