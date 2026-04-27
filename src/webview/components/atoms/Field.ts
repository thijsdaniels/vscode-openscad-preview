import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

declare global {
  interface HTMLElementTagNameMap {
    "scad-field": Field;
  }
}

@customElement("scad-field")
export class Field extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .label-row {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .label {
      flex: 1;
      min-width: 0;
      font-size: 12px;
      color: var(--vscode-editor-foreground);
      opacity: 0.75;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .value {
      flex: 1;
      min-width: 0;
    }
  `;

  @property() label = "";

  render() {
    return html`
      <div class="label-row">
        <span class="label" title=${this.label}>${this.label}</span>
        <slot name="actions"></slot>
      </div>
      <div class="value">
        <slot></slot>
      </div>
    `;
  }
}
