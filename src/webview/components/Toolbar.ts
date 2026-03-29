import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { PanelContext, panelContext } from "../contexts/PanelContext";
import {
  measurementContext,
  MeasurementContext,
} from "../contexts/MeasurementContext";
import {
  CameraMode,
  Environment,
  RenderMode,
  ViewSettings,
  ViewSettingsContext,
  viewSettingsContext,
} from "../contexts/ViewSettingsContext";
import "./MaterialSymbol";

interface MultiStateButton<T extends string> {
  type: "select";
  states: T[];
  icons: Record<T, string>;
}

interface ToggleButton {
  type: "boolean";
  icon: string;
  title: string;
}

type ViewSettingsButton<K extends keyof ViewSettings> =
  ViewSettings[K] extends string
    ? MultiStateButton<ViewSettings[K]>
    : ToggleButton;

type ViewSettingsButtons = {
  [K in keyof ViewSettings]: ViewSettingsButton<K>;
};

const viewSettingsButtons: ViewSettingsButtons = {
  camera: {
    type: "select",
    states: [CameraMode.Perspective, CameraMode.Orthographic],
    icons: {
      [CameraMode.Perspective]: "device-camera",
      [CameraMode.Orthographic]: "symbol-method",
    },
  },
  environment: {
    type: "select",
    states: [Environment.None, Environment.Grid, Environment.BuildPlate],
    icons: {
      [Environment.None]: "eye-closed",
      [Environment.Grid]: "symbol-numeric",
      [Environment.BuildPlate]: "primitive-square",
    },
  },
  renderMode: {
    type: "select",
    states: [RenderMode.Solid, RenderMode.XRay, RenderMode.Wireframe],
    icons: {
      [RenderMode.Solid]: "circle-large-filled",
      [RenderMode.XRay]: "color-mode",
      [RenderMode.Wireframe]: "circle-slash",
    },
  },
  colors: { type: "boolean", icon: "symbol-color", title: "Toggle Colors" },
  shadows: { type: "boolean", icon: "color-mode", title: "Toggle Shadows" },
  crossSection: {
    type: "boolean",
    icon: "split-horizontal",
    title: "Toggle Cross Section",
  },
};

@customElement("scad-toolbar")
export class PreviewToolbar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem;
      background: var(--vscode-panel-background);
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .toolbar-section {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
    }

    .toolbar-options {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1rem;
    }

    .toolbar-option {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.25rem;
    }

    .toolbar-separator {
      width: 1px;
      height: 1.25rem;
      background: var(--vscode-panel-border);
    }
  `;

  @consume({ context: panelContext, subscribe: true })
  @state()
  panelContext!: PanelContext;

  @consume({ context: viewSettingsContext, subscribe: true })
  @state()
  viewSettings!: ViewSettingsContext;

  @consume({ context: measurementContext, subscribe: true })
  @state()
  measurementSettings!: MeasurementContext;

  render() {
    return html`
      <div class="toolbar-section">
        <div class="toolbar-options">
          ${mapObject(viewSettingsButtons, ([key, button]) => {
            const k = key as keyof ViewSettings;
            if (button.type === "select") {
              return html`
                <div class="toolbar-option">
                  ${button.states.map((s) => {
                    const isActive = this.viewSettings.get(k) === s;
                    return html`
                      <vscode-toolbar-button
                        toggleable
                        .checked=${isActive}
                        title=${`${String(k)}: ${s}`}
                        icon=${(button.icons as Record<string, string>)[s]}
                        @change=${() =>
                          this.viewSettings.set(k, s as ViewSettings[typeof k])}
                      ></vscode-toolbar-button>
                    `;
                  })}
                </div>
              `;
            } else {
              return html`
                <vscode-toolbar-button
                  toggleable
                  .checked=${this.viewSettings.get(k)}
                  title=${button.title}
                  icon=${button.icon}
                  @change=${() =>
                    this.viewSettings.set(
                      k,
                      !this.viewSettings.get(k) as ViewSettings[typeof k],
                    )}
                ></vscode-toolbar-button>
              `;
            }
          })}
        </div>
      </div>
      <div class="toolbar-section">
        <vscode-toolbar-button
          icon="symbol-ruler"
          title="Measurement Tool"
          toggleable
          .checked=${this.measurementSettings.isActive}
          @change=${() => {
            const newActive = !this.measurementSettings.isActive;
            this.measurementSettings.setActive(newActive);
            // Also toggle the measurement panel
            if (newActive && !this.panelContext.panels.measurement) {
              this.panelContext.toggle("measurement");
            } else if (!newActive && this.panelContext.panels.measurement) {
              this.panelContext.toggle("measurement");
            }
          }}
        ></vscode-toolbar-button>
        <vscode-toolbar-button
          icon="output"
          title="Toggle Log"
          toggleable
          .checked=${this.panelContext.panels.debug}
          @change=${() => this.panelContext.toggle("debug")}
        ></vscode-toolbar-button>
        <vscode-toolbar-button
          icon="settings"
          title="Toggle Parameters"
          toggleable
          .checked=${this.panelContext.panels.parameters}
          @change=${() => this.panelContext.toggle("parameters")}
        ></vscode-toolbar-button>
      </div>
    `;
  }
}

function mapObject<K extends string, V, O extends Record<K, V>, R>(
  obj: O,
  fn: ([key, value]: [keyof O, O[keyof O]]) => R,
): R[] {
  return Object.entries(obj).map(([key, value]) =>
    fn([key as keyof O, value as O[keyof O]]),
  );
}
