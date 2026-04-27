import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
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
  icon: string;
  label: string;
}

const tabs: Tab[] = [
  { id: "parameters", icon: "settings", label: "Parameters" },
  { id: "properties", icon: "symbol-misc", label: "Properties" },
  { id: "environment", icon: "globe", label: "Environment" },
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

  render() {
    return html`
      <div class="scene-tree-container">
        <scad-scene-tree></scad-scene-tree>
      </div>
      <div class="tabbed-area">
        <div class="tab-header">
          <div class="tab-heading">${this.activeTab.label}</div>
          <div class="tab-strip">
            ${tabs.map(
              (tab) => html`
                <vscode-toolbar-button
                  icon=${tab.icon}
                  label=${tab.label}
                  toggleable
                  .checked=${tab == this.activeTab}
                  @change=${() => {
                    this.activeTab = tab;
                    this.requestUpdate();
                  }}
                ></vscode-toolbar-button>
              `,
            )}
          </div>
        </div>
        <div class="tab-content">
          ${this.activeTab.id === "parameters"
            ? html`<scad-parameters></scad-parameters>`
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
