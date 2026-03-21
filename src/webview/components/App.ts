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
    overrides: {},
    get: (name) =>
      this.parameterContext.parameters.find((p) => p.name === name),
    override: (name, value) => {
      bridge.updateParameterOverride(name, value?.toString());
    },
    revert: (name) => {
      bridge.updateParameterOverride(name, undefined);
    },
  };

  @provide({ context: modelContext })
  @state()
  modelContext: ModelContext = {
    format: null,
    base64Data: null,
    export: bridge.exportModel,
  };

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
            overrides: message.overrides || {},
          };
        } else {
          bridge.reportError("No parameters in update message");
        }
        break;
      case "loadingState":
        this.logController.processLoadingState(message.loading);
        break;
      case "log":
        if (message.message) {
          this.logController.processLogChunk(message.message);
        }
        break;
    }
  };

  render() {
    return html`
      ${this.withBottomPanel(
        this.withRightPanel(
          this.renderPreviewWithToolbar(),
          this.panelContext.panels.parameters
            ? html`<scad-parameters></scad-parameters>`
            : null,
        ),
        this.panelContext.panels.debug ? html`<scad-debug></scad-debug>` : null,
      )}
    `;
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
        fixed="end"
        handle-position=${this.parameterPanelSize}
        @vsc-split-layout-change=${(e: CustomEvent) =>
          this.handleResize("right", e)}
      >
        <div slot="start">${main}</div>
        <div slot="end">${right}</div>
      </vscode-split-layout>
    `;
  }

  private renderPreviewWithToolbar() {
    if (!this.panelContext.panels.toolbar) {
      return html`<scad-preview></scad-preview>`;
    }

    return html`
      <div style="display: flex; flex-direction: column; height: 100%;">
        <scad-toolbar></scad-toolbar>
        <scad-preview style="flex: 1;"></scad-preview>
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
