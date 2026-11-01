import { consume } from "@lit/context";
import {
  VscContextMenuSelectEvent,
  VscodeContextMenu,
} from "@vscode-elements/elements/dist/vscode-context-menu/vscode-context-menu.js";
import { css, html, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { ModelContext, modelContext } from "../../contexts/ModelContext";
import { SceneContext, sceneContext } from "../../contexts/SceneContext";
import { PanelContext, panelContext } from "../../contexts/PanelContext";
import {
  CameraMode,
  Environment,
  RenderMode,
  ViewOptions,
  ViewOptionsContext,
  viewOptionsContext,
} from "../../contexts/ViewOptionsContext";
import { t } from "../../i18n/t";
import "../atoms/Icon";
import "../atoms/IconButton";

declare global {
  interface HTMLElementTagNameMap {
    "scad-options": Options;
  }
}

@customElement("scad-options")
export class Options extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 8px;
      z-index: 10;
    }

    .group {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 4px;
      padding: 4px;
      border-radius: 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
    }
  `;

  @consume({ context: viewOptionsContext, subscribe: true })
  @state()
  private viewSettings!: ViewOptionsContext;

  @consume({ context: panelContext, subscribe: true })
  @state()
  private panelContext!: PanelContext;

  @consume({ context: modelContext, subscribe: true })
  @state()
  private modelContext!: ModelContext;

  @consume({ context: sceneContext, subscribe: true })
  @state()
  private sceneContext!: SceneContext;

  @query(".camera-picker-menu")
  private cameraPicker!: VscodeContextMenu;

  private set<K extends keyof ViewOptions>(key: K, value: ViewOptions[K]) {
    this.viewSettings.set(key, value);
  }

  render() {
    if (!this.viewSettings) return null;

    const { get } = this.viewSettings;

    return html`
      <div class="group">
        <scad-icon-button
          label=${t("options.autoRender")}
          tooltip=${t("options.autoRender.tip")}
          .latched=${this.modelContext?.autoRender ?? false}
          @click=${(e: MouseEvent) => {
            // Ctrl+click latches automatic preview; plain click renders once.
            if (e.ctrlKey || e.metaKey) this.modelContext.toggleAutoRender();
            else this.modelContext.renderNow();
          }}
        >
          <scad-icon name="auto-render"></scad-icon>
        </scad-icon-button>
      </div>

      <div class="group" style="position:relative;">
        <scad-icon-button
          label=${t("options.camera")}
          tooltip=${t("options.camera.tip")}
          @change=${() => {
            this.cameraPicker.show = true;
          }}
        >
          <scad-icon name="camera"></scad-icon>
        </scad-icon-button>
        <vscode-context-menu
          class="camera-picker-menu"
          style="position:absolute;top:100%;right:0;z-index:100;"
          .data=${this.sceneContext?.objects
            .filter((o) => o.type === "camera")
            .map((o) => ({
              label:
                o.id === this.sceneContext.activeCameraId
                  ? `● ${o.name}`
                  : o.name,
              value: o.id,
            }))}
          @vsc-context-menu-select=${(e: VscContextMenuSelectEvent) => {
            this.sceneContext.setActiveCamera(e.detail.value);
          }}
        ></vscode-context-menu>
      </div>

      <div class="group">
        <scad-icon-button
          label=${t("options.perspective")}
          tooltip=${t("options.perspective.tip")}
          toggleable
          .checked=${get("camera") === CameraMode.Perspective}
          @change=${() => this.set("camera", CameraMode.Perspective)}
        >
          <scad-icon name="camera-perspective"></scad-icon>
        </scad-icon-button>
        <scad-icon-button
          label=${t("options.orthographic")}
          tooltip=${t("options.orthographic.tip")}
          toggleable
          .checked=${get("camera") === CameraMode.Orthographic}
          @change=${() => this.set("camera", CameraMode.Orthographic)}
        >
          <scad-icon name="camera-orthographic"></scad-icon>
        </scad-icon-button>
      </div>

      <div class="group">
        <scad-icon-button
          label=${t("options.solid")}
          tooltip=${t("options.solid.tip")}
          toggleable
          .checked=${get("renderMode") === RenderMode.Solid}
          @change=${() => this.set("renderMode", RenderMode.Solid)}
        >
          <scad-icon name="render-solid"></scad-icon>
        </scad-icon-button>
        <scad-icon-button
          label=${t("options.xray")}
          tooltip=${t("options.xray.tip")}
          toggleable
          .checked=${get("renderMode") === RenderMode.XRay}
          @change=${() => this.set("renderMode", RenderMode.XRay)}
        >
          <scad-icon name="render-xray"></scad-icon>
        </scad-icon-button>
        <scad-icon-button
          label=${t("options.wireframe")}
          tooltip=${t("options.wireframe.tip")}
          toggleable
          .checked=${get("renderMode") === RenderMode.Wireframe}
          @change=${() => this.set("renderMode", RenderMode.Wireframe)}
        >
          <scad-icon name="render-wireframe"></scad-icon>
        </scad-icon-button>
      </div>

      <div class="group">
        <scad-icon-button
          label=${t("options.shadows")}
          tooltip=${t("options.shadows.tip")}
          toggleable
          .checked=${get("shadows")}
          @change=${() => this.set("shadows", !get("shadows"))}
        >
          <scad-icon name="shadows"></scad-icon>
        </scad-icon-button>
      </div>

      <div class="group">
        <scad-icon-button
          label=${t("options.envNone")}
          tooltip=${t("options.envNone.tip")}
          toggleable
          .checked=${get("environment") === Environment.None}
          @change=${() => this.set("environment", Environment.None)}
        >
          <scad-icon name="env-none"></scad-icon>
        </scad-icon-button>
        <scad-icon-button
          label=${t("options.envGrid")}
          tooltip=${t("options.envGrid.tip")}
          toggleable
          .checked=${get("environment") === Environment.Grid}
          @change=${() => this.set("environment", Environment.Grid)}
        >
          <scad-icon name="env-grid"></scad-icon>
        </scad-icon-button>
        <scad-icon-button
          label=${t("options.envBuildPlate")}
          tooltip=${t("options.envBuildPlate.tip")}
          toggleable
          .checked=${get("environment") === Environment.BuildPlate}
          @change=${() => this.set("environment", Environment.BuildPlate)}
        >
          <scad-icon name="env-build-plate"></scad-icon>
        </scad-icon-button>
      </div>

      <div class="group">
        <scad-icon-button
          label=${t("options.log")}
          tooltip=${t("options.log.tip")}
          toggleable
          .checked=${this.panelContext.panels.bottomPanel}
          @change=${() => this.panelContext.toggle("bottomPanel")}
        >
          <scad-icon name="panel-bottom"></scad-icon>
        </scad-icon-button>
        <scad-icon-button
          label=${t("options.sidePanel")}
          tooltip=${t("options.sidePanel.tip")}
          toggleable
          .checked=${this.panelContext.panels.sidePanel}
          @change=${() => this.panelContext.toggle("sidePanel")}
        >
          <scad-icon name="panel-side"></scad-icon>
        </scad-icon-button>
      </div>
    `;
  }
}
