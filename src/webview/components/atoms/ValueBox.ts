import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

declare global {
  interface HTMLElementTagNameMap {
    "scad-value-box": ValueBox;
  }
}

/**
 * Read-only text value, styled like a read-only number field, with optional
 * colour swatches in front of the text.
 */
@customElement("scad-value-box")
export class ValueBox extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
      height: 26px;
      padding: 0 6px;
      box-sizing: border-box;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-disabledForeground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 0.25rem;
      overflow: hidden;
    }

    .swatch {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      border-radius: 2px;
      border: 1px solid var(--vscode-input-border, rgba(128, 128, 128, 0.5));
    }

    .text {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;

  @property() text = "";
  /** CSS colours shown as swatches before the text. */
  @property({ type: Array }) colors: string[] = [];

  render() {
    return html`
      ${this.colors.length
        ? this.colors.map(
            (color) =>
              html`<span class="swatch" style="background:${color}"></span>`,
          )
        : nothing}
      <span class="text" title=${this.text}>${this.text}</span>
    `;
  }
}
