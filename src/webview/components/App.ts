import { provide } from "@lit/context";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ExtensionToWebviewMessage } from "../../shared/types/ExtensionToWebviewMessage";
import { modelContext, ModelContext } from "../contexts/ModelContext";
import { LogController } from "../controllers/LogController";
import { PanelContext, panelContext } from "../contexts/PanelContext";
import {
  parameterContext,
  ParameterContext,
} from "../contexts/ParameterContext";
import {
  measurementContext,
  MeasurementContext,
  SnappingMode,
} from "../contexts/MeasurementContext";
import {
  CameraMode,
  ColorMode,
  Environment,
  RenderMode,
  ShadowMode,
  viewSettingsContext,
  ViewSettingsContext,
} from "../contexts/ViewSettingsContext";
import { bridge } from "../services/Bridge";
import "./Debug";
import "./Measurement";
import "./Parameters";
import "./Preview";
import "./Toolbar";

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
      toolbar: true,
      parameters: true,
      debug: false,
      measurement: false,
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

  @state() private parameterPanelSize: string = `${window.innerWidth - 240}px`;
  @state() private debugPanelSize: string = `${window.innerHeight - 240}px`;

  @provide({ context: viewSettingsContext })
  @state()
  viewSettingsContext: ViewSettingsContext = {
    settings: {
      environment: Environment.Grid,
      renderMode: RenderMode.Solid,
      camera: CameraMode.Perspective,
      shadows: ShadowMode.On,
      colors: ColorMode.On,
    },
    get: (key) => this.viewSettingsContext.settings[key],
    is: (key, value) => this.viewSettingsContext.settings[key] === value,
    set: (key, value) => {
      this.viewSettingsContext = {
        ...this.viewSettingsContext,
        settings: {
          ...this.viewSettingsContext.settings,
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

  @provide({ context: measurementContext })
  @state()
  measurementContextValue: MeasurementContext = this.initMeasurementContext();

  private logController = new LogController(this);

  private unsubscribe: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = bridge.onMessage(this.handleMessage);
    bridge.ready();
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
    }
  };

  private initMeasurementContext(): MeasurementContext {
    return {
      isActive: false,
      snappingMode: SnappingMode.Vertex,
      measurement: {
        pointA: null,
        pointB: null,
        deltaX: null,
        deltaY: null,
        deltaZ: null,
        distance: null,
        hoveredPoint: null,
        nextPointToSet: "A",
      },
      setActive: (active: boolean) => {
        this.measurementContextValue = {
          ...this.measurementContextValue,
          isActive: active,
        };
      },
      setSnappingMode: (mode: SnappingMode) => {
        this.measurementContextValue = {
          ...this.measurementContextValue,
          snappingMode: mode,
        };
      },
      setPointA: (point) => {
        this.updateMeasurement({ pointA: point, nextPointToSet: "B" });
      },
      setPointB: (point) => {
        this.updateMeasurement({ pointB: point, nextPointToSet: "A" });
      },
      setHoveredPoint: (point) => {
        this.updateMeasurement({ hoveredPoint: point });
      },
      reset: () => {
        this.updateMeasurement({
          pointA: null,
          pointB: null,
          deltaX: null,
          deltaY: null,
          deltaZ: null,
          distance: null,
          hoveredPoint: null,
          nextPointToSet: "A",
        });
      },
    };
  }

  private updateMeasurement(
    updates: Partial<typeof this.measurementContextValue.measurement>,
  ) {
    const current = this.measurementContextValue.measurement;
    const updated = { ...current, ...updates };

    // Calculate distances if both points are set
    if (updated.pointA && updated.pointB) {
      updated.deltaX = updated.pointB.x - updated.pointA.x;
      updated.deltaY = updated.pointB.y - updated.pointA.y;
      updated.deltaZ = updated.pointB.z - updated.pointA.z;
      updated.distance = Math.sqrt(
        updated.deltaX ** 2 + updated.deltaY ** 2 + updated.deltaZ ** 2,
      );
    } else {
      updated.deltaX = null;
      updated.deltaY = null;
      updated.deltaZ = null;
      updated.distance = null;
    }

    this.measurementContextValue = {
      ...this.measurementContextValue,
      measurement: updated,
    };
  }

  render() {
    return html`
      ${this.withBottomPanel(
        this.withToolbar(
          this.withRightPanel(
            html`<scad-preview></scad-preview>`,
            this.getRightPanelContent(),
          ),
        ),
        this.panelContext.panels.debug ? html`<scad-debug></scad-debug>` : null,
      )}
    `;
  }

  private getRightPanelContent(): TemplateResult | null {
    // If measurement is active, show measurement panel
    if (this.panelContext.panels.measurement) {
      return html`<scad-measurement></scad-measurement>`;
    }

    // Otherwise show parameters if enabled
    if (this.panelContext.panels.parameters) {
      return html`<scad-parameters></scad-parameters>`;
    }

    return null;
  }

  private withBottomPanel(main: TemplateResult, bottom: TemplateResult | null) {
    if (!bottom) {
      return main;
    }

    return html`
      <vscode-split-layout
        style="width: 100%; height: 100%; --separator-border: transparent; border: none;"
        split="horizontal"
        fixed="end"
        handle-position=${this.debugPanelSize}
        @vsc-split-layout-change=${(e: CustomEvent) =>
          this.handleResize("bottom", e)}
      >
        <div slot="start">${main}</div>
        <div slot="end">${bottom}</div>
      </vscode-split-layout>
    `;
  }

  private withRightPanel(main: TemplateResult, right: TemplateResult | null) {
    if (!right) {
      return main;
    }

    return html`
      <vscode-split-layout
        style="width: 100%; height: 100%; --separator-border: transparent; border: none;"
        split="vertical"
        fixed-pane="end"
        handle-position=${this.parameterPanelSize}
        @vsc-split-layout-change=${(e: CustomEvent) =>
          this.handleResize("right", e)}
      >
        <div slot="start">${main}</div>
        <div slot="end">${right}</div>
      </vscode-split-layout>
    `;
  }

  private withToolbar(main: TemplateResult) {
    if (!this.panelContext.panels.toolbar) {
      return html`<scad-preview></scad-preview>`;
    }

    return html`
      <div style="display: flex; flex-direction: column; height: 100%;">
        <scad-toolbar></scad-toolbar>
        ${main}
      </div>
    `;
  }

  private handleResize(panel: "right" | "bottom", e: CustomEvent) {
    if (!e.detail) return;
    const size = `${e.detail.position}px`;
    if (panel === "right") this.parameterPanelSize = size;
    if (panel === "bottom") this.debugPanelSize = size;
  }
}
