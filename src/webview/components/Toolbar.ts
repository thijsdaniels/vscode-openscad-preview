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
  ColorMode,
  Environment,
  RenderMode,
  ShadowMode,
  ViewSettings,
  ViewSettingsContext,
  viewSettingsContext,
} from "../contexts/ViewSettingsContext";
import "./MaterialSymbol";

interface ToolbarButton<T extends string> {
  states: T[];
  icons: Record<T, string>;
  defaultState: T;
}

type ViewSettingsButtons = {
  [K in keyof ViewSettings]: ToolbarButton<ViewSettings[K]>;
};

const viewSettingsButtons: ViewSettingsButtons = {
  camera: {
    states: [CameraMode.Perspective, CameraMode.Orthographic],
    icons: {
      [CameraMode.Perspective]: "device-camera",
      [CameraMode.Orthographic]: "symbol-method",
    },
    defaultState: CameraMode.Perspective,
  },
  environment: {
    states: [Environment.None, Environment.Grid, Environment.BuildPlate],
    icons: {
      [Environment.None]: "eye-closed",
      [Environment.Grid]: "symbol-numeric",
      [Environment.BuildPlate]: "primitive-square",
    },
    defaultState: Environment.Grid,
  },
  renderMode: {
    states: [RenderMode.Solid, RenderMode.XRay, RenderMode.Wireframe],
    icons: {
      [RenderMode.Solid]: "circle-large-filled",
      [RenderMode.XRay]: "color-mode",
      [RenderMode.Wireframe]: "circle-slash",
    },
    defaultState: RenderMode.Solid,
  },
  colors: {
    states: [ColorMode.On, ColorMode.Off],
    icons: {
      [ColorMode.On]: "symbol-color",
      [ColorMode.Off]: "paintcan",
    },
    defaultState: ColorMode.On,
  },
  shadows: {
    states: [ShadowMode.Off, ShadowMode.On],
    icons: {
      [ShadowMode.Off]: "circle-large",
      [ShadowMode.On]: "color-mode",
    },
    defaultState: ShadowMode.On,
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
            return html`
              <div class="toolbar-option">
                ${button.states.map((state) => {
                  const currentValue = this.viewSettings.get(key);
                  const isActive = currentValue === state;

                  return html`
                    <vscode-toolbar-button
                      toggleable
                      .checked=${isActive}
                      title=${`${key}: ${state}`}
                      icon=${button.icons[state as keyof typeof button.icons]}
                      @change=${() => this.viewSettings.set(key, state)}
                    ></vscode-toolbar-button>
                  `;
                })}
              </div>
            `;
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
