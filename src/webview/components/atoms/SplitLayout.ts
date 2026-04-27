import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

declare global {
  interface HTMLElementTagNameMap {
    "scad-split-layout": SplitLayout;
  }
}

@customElement("scad-split-layout")
export class SplitLayout extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;

  @property() split: "horizontal" | "vertical" = "vertical";
  @property({ attribute: "fixed-pane" }) fixedPane: "start" | "end" = "end";
  @property({ attribute: "handle-position" }) handlePosition = "50%";

  render() {
    return html`
      <vscode-split-layout
        style="width: 100%; height: 100%; --separator-border: var(--vscode-panel-border); border: none;"
        split=${this.split}
        fixed-pane=${this.fixedPane}
        handle-position=${this.handlePosition}
        @vsc-split-layout-change=${(e: CustomEvent) => {
          this.dispatchEvent(
            new CustomEvent("vsc-split-layout-change", {
              detail: e.detail,
              bubbles: true,
              composed: true,
            }),
          );
        }}
      >
        <slot name="start" slot="start"></slot>
        <slot name="end" slot="end"></slot>
      </vscode-split-layout>
    `;
  }
}
