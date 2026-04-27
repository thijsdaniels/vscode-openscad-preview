import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

declare global {
  interface HTMLElementTagNameMap {
    "scad-icon-button": IconButton;
  }
}

@customElement("scad-icon-button")
export class IconButton extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      border-radius: 5px;
      background: transparent;
      color: var(--vscode-foreground);
      cursor: pointer;
      outline-offset: -1px;
      outline-width: 1px;
    }

    button:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    button:focus-visible {
      outline-color: var(--vscode-focusBorder);
      outline-style: solid;
    }

    button.checked {
      background: var(--vscode-inputOption-activeBackground);
      outline: 1px solid var(--vscode-inputOption-activeBorder);
      color: var(--vscode-inputOption-activeForeground);
    }

    ::slotted(svg) {
      display: block;
    }
  `;

  @property() label = "";
  @property({ type: Boolean, reflect: true }) toggleable = false;
  @property({ type: Boolean, reflect: true }) checked = false;

  render() {
    return html`
      <button
        aria-label=${this.label || nothing}
        role=${this.toggleable ? "switch" : nothing}
        aria-checked=${this.toggleable ? this.checked : nothing}
        class=${this.toggleable && this.checked ? "checked" : ""}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }

  private handleClick() {
    if (this.toggleable) {
      this.checked = !this.checked;
    }
    this.dispatchEvent(
      new Event("change", { bubbles: true, composed: true }),
    );
  }
}
