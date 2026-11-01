import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { t } from "../../i18n/t";
import "./IconButton";

export class PickFieldChangeEvent extends CustomEvent<{ value: string }> {
  static readonly eventName = "change" as const;
  constructor(value: string) {
    super(PickFieldChangeEvent.eventName, {
      detail: { value },
      bubbles: true,
      composed: true,
    });
  }
}

/** Fired when the browse button is clicked; the owner opens the box. */
export class PickFieldPickEvent extends Event {
  static readonly eventName = "pick" as const;
  constructor() {
    super(PickFieldPickEvent.eventName, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "scad-pick-field": PickField;
  }
}

/** Editable text with a browse button (file, folder, font…). */
@customElement("scad-pick-field")
export class PickField extends LitElement {
  static styles = css`
    :host {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    vscode-textfield {
      flex: 1;
      min-width: 0;
    }
  `;

  @property() value = "";
  /** Accessible name of the browse button. */
  @property() label = "";
  /** Hover text of the browse button. */
  @property() tooltip = "";

  render() {
    return html`
      <vscode-textfield
        title=${t("parameters.text.tip")}
        size="3"
        .value=${this.value}
        @change=${(e: Event) => {
          e.stopPropagation();
          this.dispatchEvent(
            new PickFieldChangeEvent((e.target as HTMLInputElement).value),
          );
        }}
      ></vscode-textfield>
      <scad-icon-button
        label=${this.label}
        tooltip=${this.tooltip}
        @click=${() => this.dispatchEvent(new PickFieldPickEvent())}
      >
        <slot></slot>
      </scad-icon-button>
    `;
  }
}
