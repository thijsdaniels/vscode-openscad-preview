import { consume } from "@lit/context";
import {
  VscContextMenuSelectEvent,
  VscodeContextMenu,
} from "@vscode-elements/elements/dist/vscode-context-menu/vscode-context-menu.js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import {
  SceneContext,
  sceneContext,
  SceneObjectDescriptor,
  SceneObjectType,
} from "../../contexts/SceneContext";
import { sceneObjectMeta } from "../../data/sceneObjectMeta";
import "../atoms/Icon";

const ADD_MENU_ITEMS: {
  label?: string;
  value?: string;
  separator?: boolean;
}[] = [
  { label: sceneObjectMeta["camera"].label, value: "camera" },
  { separator: true },
  {
    label: sceneObjectMeta["cross-section-plane"].label,
    value: "cross-section-plane",
  },
  { separator: true },
  { label: sceneObjectMeta["ambient-light"].label, value: "ambient-light" },
  {
    label: sceneObjectMeta["directional-light"].label,
    value: "directional-light",
  },
  { label: sceneObjectMeta["spot-light"].label, value: "spot-light" },
  { label: sceneObjectMeta["point-light"].label, value: "point-light" },
];

declare global {
  interface HTMLElementTagNameMap {
    "scad-scene-tree": SceneTree;
  }
}

@customElement("scad-scene-tree")
export class SceneTree extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 32px;
      padding: 0px 6px 0px 12px;
      background-color: var(--vscode-panel-background);
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .heading {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--vscode-panelTitle-foreground);
    }

    .header-actions {
      position: relative;
    }

    vscode-context-menu {
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 100;
    }

    .object-list {
      flex: 1;
      overflow-y: auto;
    }

    .object-row {
      display: flex;
      align-items: center;
      padding: 6px 6px 6px 12px;
      gap: 6px;
      cursor: pointer;
    }

    .object-row:nth-child(even) {
      background: rgba(0, 0, 0, 0.15);
    }

    .object-row:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .object-row.selected {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }

    .object-row.disabled .object-name {
      opacity: 0.5;
    }

    .object-name {
      flex: 1;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--vscode-editor-foreground);
      opacity: 0.75;
    }

    .object-row:hover .object-name {
      opacity: 1;
    }

    .object-row:not(:hover) .remove-button {
      display: none;
    }
  `;

  @consume({ context: sceneContext, subscribe: true })
  @state()
  private sceneContext!: SceneContext;

  @query("vscode-context-menu")
  private addMenu!: VscodeContextMenu;

  render() {
    return html`
      <div class="header">
        <span class="heading">Scene</span>
        <div class="header-actions">
          <vscode-toolbar-button
            icon="add"
            label="Add object"
            @click=${() => {
              this.addMenu.show = true;
            }}
          ></vscode-toolbar-button>
          <vscode-context-menu
            .data=${ADD_MENU_ITEMS}
            @vsc-context-menu-select=${(e: VscContextMenuSelectEvent) => {
              this.sceneContext.addObject(e.detail.value as SceneObjectType);
            }}
          ></vscode-context-menu>
        </div>
      </div>
      <div class="object-list">
        ${this.sceneContext?.objects.length
          ? this.sceneContext.objects.map((obj) => this.renderRow(obj))
          : nothing}
      </div>
    `;
  }

  private renderRow(obj: SceneObjectDescriptor) {
    const selected = this.sceneContext.selectedId === obj.id;
    const isActiveCamera = this.sceneContext.activeCameraId === obj.id;

    return html`
      <div
        class=${classMap({
          "object-row": true,
          selected,
          disabled: !obj.active,
          hidden: !obj.visible,
        })}
        @click=${() => this.sceneContext.selectObject(obj.id)}
      >
        <scad-icon name=${sceneObjectMeta[obj.type].icon}></scad-icon>
        <span class="object-name">${obj.name}</span>
        <vscode-toolbar-button
          class="remove-button"
          icon="trash"
          label="Remove"
          ?disabled=${isActiveCamera}
          @click=${(e: Event) => {
            e.stopPropagation();
            if (!isActiveCamera) this.sceneContext.removeObject(obj.id);
          }}
        ></vscode-toolbar-button>
        ${sceneObjectMeta[obj.type].supportsActive
          ? html`
              <vscode-toolbar-button
                icon="symbol-event"
                label=${obj.active ? "Disable" : "Enable"}
                toggleable
                .checked=${obj.active}
                @click=${(e: Event) => e.stopPropagation()}
                @change=${(e: Event) => {
                  e.stopPropagation();
                  this.sceneContext.setActive(obj.id, !obj.active);
                }}
              ></vscode-toolbar-button>
            `
          : nothing}
        <vscode-toolbar-button
          icon="eye"
          label=${obj.visible ? "Hide" : "Show"}
          toggleable
          .checked=${obj.visible}
          ?disabled=${isActiveCamera}
          @click=${(e: Event) => e.stopPropagation()}
          @change=${(e: Event) => {
            e.stopPropagation();
            this.sceneContext.setVisible(obj.id, !obj.visible);
          }}
        ></vscode-toolbar-button>
      </div>
    `;
  }
}
