import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { MessageKey, t } from "../../i18n/t";
import {
  collapsedLayout,
  expandedLayout,
  GroupLayout,
  toggleAccordion,
} from "../../services/GroupLayout";
import type { IconName } from "../atoms/Icon";
import type { GroupLayoutChangeEvent } from "./Parameters";
import "../atoms/Icon";
import "../atoms/IconButton";
import "./Environment";
import "./ObjectProperties";
import "./Parameters";
import "./SceneTree";

declare global {
  interface HTMLElementTagNameMap {
    "scad-side-panel": SidePanel;
  }
}

interface Tab {
  id: string;
  icon: IconName;
  label: MessageKey;
  tip: MessageKey;
}

const tabs: Tab[] = [
  {
    id: "parameters",
    icon: "settings",
    label: "tab.parameters",
    tip: "tab.parameters.tip",
  },
  {
    id: "properties",
    icon: "scene",
    label: "tab.properties",
    tip: "tab.properties.tip",
  },
  {
    id: "environment",
    icon: "globe",
    label: "tab.environment",
    tip: "tab.environment.tip",
  },
];

@customElement("scad-side-panel")
export class SidePanel extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--vscode-editor-background);
    }

    .scene-tree-container {
      flex: 1;
      overflow: hidden;
    }

    .tabbed-area {
      flex: 2;
      min-height: 0;
      display: flex;
      flex-direction: column;
      border-top: 1px solid var(--vscode-panel-border);
    }

    .tab-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-panel-background);
      padding: 6px 6px 6px 12px;
      gap: 6px;
    }

    .tab-heading {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--vscode-panelTitle-foreground);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tab-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      gap: 6px;
    }

    .separator {
      width: 1px;
      height: 16px;
      background: var(--vscode-panel-border);
    }

    .tab-strip {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-shrink: 0;
      gap: 6px;
    }

    .tab-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `;

  @state() private activeTab: Tab = tabs[0];
  /** Parameter groups layout, kept here so it survives tab switches. */
  @state() private groupLayout: GroupLayout = expandedLayout();

  private renderGroupLayoutButtons() {
    return html`
      <div class="tab-actions">
        <scad-icon-button
          label=${t("parameters.accordion")}
          tooltip=${t("parameters.accordion.tip")}
          toggleable
          .checked=${this.groupLayout.mode === "accordion"}
          @change=${() =>
            (this.groupLayout = toggleAccordion(this.groupLayout))}
        >
          <scad-icon name="accordion"></scad-icon>
        </scad-icon-button>
        <scad-icon-button
          label=${t("parameters.expandAll")}
          tooltip=${t("parameters.expandAll.tip")}
          @click=${() => (this.groupLayout = expandedLayout())}
        >
          <scad-icon name="expand-all"></scad-icon>
        </scad-icon-button>
        <scad-icon-button
          label=${t("parameters.collapseAll")}
          tooltip=${t("parameters.collapseAll.tip")}
          @click=${() => (this.groupLayout = collapsedLayout())}
        >
          <scad-icon name="collapse-all"></scad-icon>
        </scad-icon-button>
        <span class="separator"></span>
      </div>
    `;
  }

  render() {
    return html`
      <div class="scene-tree-container">
        <scad-scene-tree></scad-scene-tree>
      </div>
      <div class="tabbed-area">
        <div class="tab-header">
          <div class="tab-heading" title=${t(this.activeTab.tip)}>
            ${t(this.activeTab.label)}
          </div>
          ${this.activeTab.id === "parameters"
            ? this.renderGroupLayoutButtons()
            : nothing}
          <div class="tab-strip">
            ${tabs.map(
              (tab) => html`
                <scad-icon-button
                  label=${t(tab.label)}
                  tooltip=${t(tab.tip)}
                  toggleable
                  .checked=${tab == this.activeTab}
                  @change=${() => {
                    this.activeTab = tab;
                    this.requestUpdate();
                  }}
                >
                  <scad-icon name=${tab.icon}></scad-icon>
                </scad-icon-button>
              `,
            )}
          </div>
        </div>
        <div class="tab-content">
          ${this.activeTab.id === "parameters"
            ? html`<scad-parameters
                .groupLayout=${this.groupLayout}
                @group-layout-change=${(e: GroupLayoutChangeEvent) =>
                  (this.groupLayout = e.detail.layout)}
              ></scad-parameters>`
            : nothing}
          ${this.activeTab.id === "properties"
            ? html`<scad-object-properties></scad-object-properties>`
            : nothing}
          ${this.activeTab.id === "environment"
            ? html`<scad-environment></scad-environment>`
            : nothing}
        </div>
      </div>
    `;
  }
}
