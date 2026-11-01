import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  ActiveTool,
  ActiveToolContext,
  activeToolContext,
} from "../../contexts/ActiveToolContext";
import { ModelContext, modelContext } from "../../contexts/ModelContext";
import { MessageKey, t } from "../../i18n/t";
import type { IconName } from "../atoms/Icon";
import "../atoms/Icon";
import "../atoms/IconButton";

declare global {
  interface HTMLElementTagNameMap {
    "scad-toolbar": Toolbar;
  }
}

interface ToolVariant {
  id: string;
  icon: IconName;
  label: MessageKey;
  tip: MessageKey;
}

interface Tool {
  id: ActiveTool;
  icon: IconName;
  label: MessageKey;
  tip: MessageKey;
  variants?: ToolVariant[];
  defaultVariant?: string;
}

const groups: Tool[][] = [
  [
    {
      id: ActiveTool.Select,
      icon: "tool-select",
      label: "tool.select",
      tip: "tool.select.tip",
    },
  ],
  [
    {
      id: ActiveTool.Move,
      icon: "tool-move",
      label: "tool.move",
      tip: "tool.move.tip",
    },
    {
      id: ActiveTool.Rotate,
      icon: "tool-rotate",
      label: "tool.rotate",
      tip: "tool.rotate.tip",
    },
    {
      id: ActiveTool.Scale,
      icon: "tool-scale",
      label: "tool.scale",
      tip: "tool.scale.tip",
    },
  ],
  [
    {
      id: ActiveTool.Measure,
      icon: "tool-measure",
      label: "tool.measure",
      tip: "tool.measure.tip",
      defaultVariant: "vertex",
      variants: [
        {
          id: "vertex",
          icon: "snap-vertex",
          label: "tool.measure.vertex",
          tip: "tool.measure.vertex.tip",
        },
        {
          id: "edge",
          icon: "snap-edge",
          label: "tool.measure.edge",
          tip: "tool.measure.edge.tip",
        },
        {
          id: "face",
          icon: "snap-face",
          label: "tool.measure.face",
          tip: "tool.measure.face.tip",
        },
      ],
    },
  ],
];

@customElement("scad-toolbar")
export class Toolbar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      position: absolute;
      top: 16px;
      left: 16px;
      gap: 8px;
      align-items: flex-start;
      z-index: 10;
    }

    .group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 4px;
      border-radius: 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
    }

    .group.horizontal {
      flex-direction: row;
    }

    .tool {
      position: relative;
    }

    .variants {
      display: none;
      position: absolute;
      padding-left: 12px;
      left: 100%;
      top: -5px;
    }

    .tool:hover .variants {
      display: flex;
    }
  `;

  @consume({ context: activeToolContext, subscribe: true })
  @state()
  private activeToolContext!: ActiveToolContext;

  @consume({ context: modelContext, subscribe: true })
  @state()
  private modelContext!: ModelContext;

  private rememberedVariants = new Map<ActiveTool, string>();

  render() {
    return html`
      <div class="group">
        <scad-icon-button
          label=${t("toolbar.settings")}
          tooltip=${t("toolbar.settings.tip")}
          @click=${() => this.modelContext.openSettings()}
        >
          <vscode-icon name="settings-gear"></vscode-icon>
        </scad-icon-button>
      </div>
      ${groups.map(
        (group) => html`
          <div class="group">${group.map((tool) => this.renderTool(tool))}</div>
        `,
      )}
    `;
  }

  private renderTool(tool: Tool) {
    const activeVariant = this.getActiveVariant(tool);

    return html`
      <div class="tool">
        <scad-icon-button
          label=${t(tool.label)}
          tooltip=${t(tool.tip)}
          toggleable
          .checked=${this.activeToolContext?.activeTool === tool.id}
          @change=${() => {
            this.activeToolContext.setActiveTool(tool.id, activeVariant);
            this.requestUpdate();
          }}
        >
          <scad-icon name=${tool.icon}></scad-icon>
        </scad-icon-button>
        ${tool.variants
          ? html`
              <div class="variants">
                <div class="group horizontal">
                  ${tool.variants.map(
                    (variant) => html`
                      <scad-icon-button
                        label=${t(variant.label)}
                        tooltip=${t(variant.tip)}
                        toggleable
                        .checked=${activeVariant === variant.id}
                        @change=${() => {
                          this.rememberedVariants.set(tool.id, variant.id);
                          if (this.activeToolContext.activeTool === tool.id) {
                            this.activeToolContext.setVariant(variant.id);
                          } else {
                            this.activeToolContext.setActiveTool(
                              tool.id,
                              variant.id,
                            );
                          }
                          this.requestUpdate();
                        }}
                      >
                        <scad-icon name=${variant.icon}></scad-icon>
                      </scad-icon-button>
                    `,
                  )}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private getActiveVariant(tool: Tool): string | undefined {
    if (!tool.variants) return undefined;
    return this.rememberedVariants.get(tool.id) ?? tool.defaultVariant;
  }
}
