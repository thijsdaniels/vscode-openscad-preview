import { provide } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { Preview } from "./main/Preview";
import { ExtensionToWebviewMessage } from "../../shared/types/ExtensionToWebviewMessage";
import {
  ActiveTool,
  activeToolContext,
  ActiveToolContext,
} from "../contexts/ActiveToolContext";
import { modelContext, ModelContext } from "../contexts/ModelContext";
import { PanelContext, panelContext } from "../contexts/PanelContext";
import {
  parameterContext,
  ParameterContext,
} from "../contexts/ParameterContext";
import {
  SceneContext,
  SceneObjectType,
  SceneSnapshot,
  sceneContext,
} from "../contexts/SceneContext";
import {
  ObjectProperties,
  SelectedObjectContext,
  selectedObjectContext,
} from "../contexts/SelectedObjectContext";
import {
  CameraMode,
  Environment,
  RenderMode,
  ViewOptionsContext,
  viewOptionsContext,
} from "../contexts/ViewOptionsContext";
import { LogController } from "../controllers/LogController";
import { bridge } from "../services/Bridge";
import { defaultScene } from "../data/defaultScene";
import { sceneObjectMeta } from "../data/sceneObjectMeta";
import "./aside/SidePanel";
import "./atoms/SplitLayout";
import "./footer/Output";
import "./main/Options";
import "./main/Preview";
import "./main/Toolbar";

declare global {
  interface HTMLElementTagNameMap {
    "scad-app": App;
  }
}

@customElement("scad-app")
export class App extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background-color: var(--vscode-panel-background);
      color: var(--vscode-panel-foreground);
    }
  `;

  @provide({ context: panelContext })
  @state()
  private panelContext: PanelContext = {
    panels: {
      sidePanel: true,
      bottomPanel: false,
    },
    toggle: (panel: keyof PanelContext["panels"]) => {
      this.panelContext = {
        ...this.panelContext,
        panels: {
          ...this.panelContext.panels,
          [panel]: !this.panelContext.panels[panel],
        },
      };
    },
  };

  @state() private parameterPanelSize: string = `${window.innerWidth - 280}px`;
  @state() private debugPanelSize: string = `${window.innerHeight - 240}px`;

  @provide({ context: viewOptionsContext })
  @state()
  viewSettingsContext: ViewOptionsContext = {
    options: {
      environment: Environment.Grid,
      renderMode: RenderMode.Solid,
      camera: CameraMode.Perspective,
      shadows: false,
      fogDensity: 0,
    },
    get: (key) => this.viewSettingsContext.options[key],
    is: (key, value) => this.viewSettingsContext.options[key] === value,
    set: (key, value) => {
      this.viewSettingsContext = {
        ...this.viewSettingsContext,
        options: {
          ...this.viewSettingsContext.options,
          [key]: value,
        },
      };
    },
  };

  @provide({ context: parameterContext })
  @state()
  parameterContext: ParameterContext = {
    parameters: [],
    parameterSets: {},
    activeSetName: undefined,
    overrides: {},
    get: (name) =>
      this.parameterContext.parameters.find((p) => p.name === name),
    override: (name, value) => {
      bridge.updateParameterOverride(name, value);
    },
    revert: (name) => {
      bridge.updateParameterOverride(name, undefined);
    },
    saveSet: (name) => {
      bridge.saveParameterSet(name);
    },
    saveAsNewSet: () => {
      bridge.promptSaveParameterSet();
    },
    applySet: (name) => {
      bridge.applyParameterSet(name);
    },
    deleteSet: (name) => {
      bridge.deleteParameterSet(name);
    },
  };

  @provide({ context: modelContext })
  @state()
  modelContext: ModelContext = {
    format: null,
    base64Data: null,
    isLoading: true,
    loadingMessage: "Rendering SCAD...",
    export: bridge.exportModel,
    sendToSlicer: bridge.sendToSlicer,
  };

  @provide({ context: activeToolContext })
  @state()
  activeToolContextValue: ActiveToolContext = {
    activeTool: ActiveTool.Select,
    variant: null,
    setActiveTool: (tool: ActiveTool, variant?: string | null) => {
      this.activeToolContextValue = {
        ...this.activeToolContextValue,
        activeTool: tool,
        variant: variant ?? null,
      };
    },
    setVariant: (variant: string) => {
      this.activeToolContextValue = {
        ...this.activeToolContextValue,
        variant,
      };
    },
  };

  @provide({ context: sceneContext })
  @state()
  sceneContextValue: SceneContext = {
    objects: defaultScene,
    selectedId: null,
    activeCameraId: "camera-default",
    addObject: (type: SceneObjectType) => {
      const id = `${type}-${Date.now()}`;

      const count =
        this.sceneContextValue.objects.filter((o) => o.type === type).length +
        1;

      const name = `${sceneObjectMeta[type].label} ${count}`;

      this.sceneContextValue = {
        ...this.sceneContextValue,
        objects: [
          ...this.sceneContextValue.objects,
          { id, type, name, visible: true, active: true },
        ],
      };

      this.previewEl?.stage?.addSceneObject(type, id);
      this.schedulePersist();
    },
    removeObject: (id: string) => {
      this.sceneContextValue = {
        ...this.sceneContextValue,
        objects: this.sceneContextValue.objects.filter((o) => o.id !== id),
        selectedId:
          this.sceneContextValue.selectedId === id
            ? null
            : this.sceneContextValue.selectedId,
      };

      this.previewEl?.stage?.removeSceneObject(id);
      this.schedulePersist();
    },
    selectObject: (id: string | null) => {
      this.sceneContextValue = { ...this.sceneContextValue, selectedId: id };
      this.previewEl?.stage?.selectObject(id);
    },
    renameObject: (id: string, name: string) => {
      this.sceneContextValue = {
        ...this.sceneContextValue,
        objects: this.sceneContextValue.objects.map((o) =>
          o.id === id ? { ...o, name } : o,
        ),
      };
      this.schedulePersist();
    },
    setVisible: (id: string, visible: boolean) => {
      this.sceneContextValue = {
        ...this.sceneContextValue,
        objects: this.sceneContextValue.objects.map((o) =>
          o.id === id ? { ...o, visible } : o,
        ),
      };

      this.previewEl?.stage?.setObjectVisible(id, visible);
      this.schedulePersist();
    },
    setActive: (id: string, active: boolean) => {
      this.sceneContextValue = {
        ...this.sceneContextValue,
        objects: this.sceneContextValue.objects.map((o) =>
          o.id === id ? { ...o, active } : o,
        ),
      };

      this.previewEl?.stage?.setObjectActive(id, active);
      this.schedulePersist();
    },
    setActiveCamera: (id: string) => {
      this.sceneContextValue = {
        ...this.sceneContextValue,
        activeCameraId: id,
      };
      this.previewEl?.stage?.setActiveCamera(id);
      this.schedulePersist();
    },
  };

  @provide({ context: selectedObjectContext })
  @state()
  selectedObjectContextValue: SelectedObjectContext = {
    type: null,
    properties: null,
    setProperty: (key: string, value: number) => {
      const id = this.sceneContextValue.selectedId;
      if (id) this.previewEl?.stage?.setObjectProperty(id, key, value);
    },
  };

  @query("scad-preview")
  private previewEl?: Preview;

  private logController = new LogController(this);

  private unsubscribe: (() => void) | null = null;

  /** True once the extension has answered our `ready` with a `loadScene`. */
  private sceneLoaded = false;
  /** Properties to apply per object id during the initial Stage replay. */
  private pendingProperties: Map<string, ObjectProperties> | null = null;
  private persistTimer: number | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = bridge.onMessage(this.handleMessage);
    bridge.ready();
  }

  private schedulePersist() {
    if (this.persistTimer !== null) {
      window.clearTimeout(this.persistTimer);
    }
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = null;
      this.persistScene();
    }, 500);
  }

  private persistScene() {
    if (!this.sceneLoaded) return;
    const stage = this.previewEl?.stage;
    if (!stage) return;
    const properties = stage.serializeProperties();
    const snapshot: SceneSnapshot = {
      version: 1,
      activeCameraId: this.sceneContextValue.activeCameraId,
      objects: this.sceneContextValue.objects.map((o) => {
        const props = properties.get(o.id);
        return props ? { ...o, properties: props } : { ...o };
      }),
    };
    bridge.persistScene(snapshot);
  }

  private _stageWired = false;

  updated() {
    if (!this._stageWired && this.previewEl?.stage && this.sceneLoaded) {
      this._stageWired = true;
      this.previewEl.stage.setSelectionCallbacks(
        (id) => {
          this.sceneContextValue = {
            ...this.sceneContextValue,
            selectedId: id,
          };
        },
        (props) => {
          this.selectedObjectContextValue = {
            ...this.selectedObjectContextValue,
            type: props?.type ?? null,
            properties: props,
          };
          // Gizmo drag and Object Properties edits both flow through here.
          // Debouncing absorbs per-frame drag updates into one persist write.
          this.schedulePersist();
        },
      );
      this.previewEl.stage.setPersistCallback(() => this.schedulePersist());
      this.previewEl.stage.setObjectRegisteredCallback((id, type) => {
        const count =
          this.sceneContextValue.objects.filter((o) => o.type === type).length +
          1;
        this.sceneContextValue = {
          ...this.sceneContextValue,
          objects: [
            ...this.sceneContextValue.objects,
            {
              id,
              type,
              name: `${sceneObjectMeta[type].label} ${count}`,
              visible: true,
              active: true,
            },
          ],
          selectedId: id,
        };
      });
      // Replay initial scene objects into Stage
      for (const obj of this.sceneContextValue.objects) {
        this.previewEl.stage.addSceneObject(obj.type, obj.id);

        const props = this.pendingProperties?.get(obj.id);
        if (props) {
          for (const [key, value] of Object.entries(props)) {
            if (key !== "type" && typeof value === "number") {
              this.previewEl.stage.setObjectProperty(obj.id, key, value);
            }
          }
        }

        if (!obj.active) {
          this.previewEl.stage.setObjectActive(obj.id, false);
        }

        if (!obj.visible) {
          this.previewEl.stage.setObjectVisible(obj.id, false);
        }
      }
      this.previewEl.stage.setActiveCamera(
        this.sceneContextValue.activeCameraId,
      );
      this.pendingProperties = null;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private handleMessage = (message: ExtensionToWebviewMessage) => {
    switch (message.type) {
      case "update":
        if (message.content) {
          this.modelContext = {
            ...this.modelContext,
            format: message.format,
            base64Data: message.content,
            isLoading: false,
          };
        } else {
          bridge.reportError("No content in update message");
        }
        break;
      case "updateParameters":
        if (message.parameters) {
          this.parameterContext = {
            ...this.parameterContext,
            parameters: message.parameters,
            parameterSets: message.parameterSets || {},
            activeSetName: message.activeSetName,
            overrides: message.overrides || {},
          };
        } else {
          bridge.reportError("No parameters in update message");
        }
        break;
      case "loadingState":
        this.logController.processLoadingState(message.loading);
        this.modelContext = {
          ...this.modelContext,
          isLoading: message.loading,
          loadingMessage: message.message ?? "Rendering SCAD...",
        };
        break;
      case "log":
        if (message.message) {
          this.logController.processLogChunk(message.message);
        }
        break;
      case "loadScene":
        this.applySceneSnapshot(message.snapshot);
        break;
    }
  };

  private applySceneSnapshot(snapshot: unknown) {
    const parsed = this.parseSnapshot(snapshot);
    if (parsed) {
      const { properties, ...rest } = this.deconstructSnapshot(parsed);
      this.pendingProperties = properties;
      this.sceneContextValue = {
        ...this.sceneContextValue,
        objects: rest.objects,
        activeCameraId: rest.activeCameraId,
      };
    }
    this.sceneLoaded = true;
    this.requestUpdate();
  }

  private parseSnapshot(snapshot: unknown): SceneSnapshot | null {
    if (!snapshot || typeof snapshot !== "object") return null;
    const s = snapshot as Partial<SceneSnapshot>;
    if (s.version !== 1) return null;
    if (!Array.isArray(s.objects) || typeof s.activeCameraId !== "string") {
      return null;
    }
    return s as SceneSnapshot;
  }

  private deconstructSnapshot(snapshot: SceneSnapshot) {
    const properties = new Map<string, ObjectProperties>();
    const objects = snapshot.objects.map((entry) => {
      const { properties: p, ...descriptor } = entry;
      if (p) properties.set(descriptor.id, p);
      return descriptor;
    });
    return {
      objects,
      activeCameraId: snapshot.activeCameraId,
      properties,
    };
  }

  render() {
    const { sidePanel, bottomPanel } = this.panelContext.panels;

    return html`
      <scad-split-layout
        split="horizontal"
        fixed-pane="end"
        handle-position=${bottomPanel ? this.debugPanelSize : "100%"}
        @vsc-split-layout-change=${(e: CustomEvent) =>
          this.handleResize("bottom", e)}
      >
        <scad-split-layout
          slot="start"
          split="vertical"
          fixed-pane="end"
          handle-position=${sidePanel ? this.parameterPanelSize : "100%"}
          @vsc-split-layout-change=${(e: CustomEvent) =>
            this.handleResize("right", e)}
        >
          <div slot="start" style="position:relative;width:100%;height:100%;">
            <scad-preview></scad-preview>
            <scad-toolbar></scad-toolbar>
            <scad-options></scad-options>
          </div>
          <div slot="end">
            ${sidePanel ? html`<scad-side-panel></scad-side-panel>` : nothing}
          </div>
        </scad-split-layout>
        <div slot="end">
          ${bottomPanel ? html`<scad-output></scad-output>` : nothing}
        </div>
      </scad-split-layout>
    `;
  }

  private handleResize(panel: "right" | "bottom", e: CustomEvent) {
    if (!e.detail) return;
    const size = `${e.detail.position}px`;
    if (panel === "right") this.parameterPanelSize = size;
    if (panel === "bottom") this.debugPanelSize = size;
  }
}
