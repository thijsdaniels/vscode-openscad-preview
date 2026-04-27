import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("scad-collapsible")
export class ScadCollapsible extends LitElement {
  @property({ type: String }) heading = "";
  @property({ type: Boolean, reflect: true }) open = false;

  static styles = css`
    :host {
      display: block;
    }

    .header {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 32px;
      padding: 0px 9px 0px 12px;
      cursor: pointer;
      background-color: color-mix(
        in hsl,
        var(--vscode-panel-background),
        var(--vscode-editor-background)
      );
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .heading {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--vscode-panelTitle-foreground);
    }

    .content {
      display: none;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
    }

    :host([open]) {
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    :host([open]) .content {
      display: flex;
    }
  `;

  render() {
    return html`
      <div class="header" @click="${this.toggle}">
        <span class="heading">${this.heading}</span>
        <vscode-icon
          .name="${this.open ? "chevron-up" : "chevron-down"}"
        ></vscode-icon>
      </div>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }

  toggle() {
    this.open = !this.open;
  }
}
