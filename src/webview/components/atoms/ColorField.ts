import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { t } from "../../i18n/t";

export class ColorFieldChangeEvent extends CustomEvent<{ value: string }> {
  static readonly eventName = "change" as const;
  constructor(value: string) {
    super(ColorFieldChangeEvent.eventName, {
      detail: { value },
      bubbles: true,
      composed: true,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "scad-color-field": ColorField;
  }
}

/** Colour swatch opening the palette, next to the editable colour text. */
@customElement("scad-color-field")
export class ColorField extends LitElement {
  static styles = css`
    :host {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    input[type="color"] {
      flex-shrink: 0;
      width: 26px;
      height: 26px;
      padding: 0;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 0.25rem;
      background: none;
      cursor: pointer;
    }

    input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 2px;
    }

    input[type="color"]::-webkit-color-swatch {
      border: none;
      border-radius: 2px;
    }

    vscode-textfield {
      flex: 1;
      min-width: 0;
    }
  `;

  @property() value = "";

  render() {
    return html`
      <input
        type="color"
        title=${t("parameters.color.tip")}
        .value=${toHex(this.value)}
        @change=${(e: Event) =>
          this.emit(e, (e.target as HTMLInputElement).value)}
      />
      <vscode-textfield
        title=${t("parameters.colorText.tip")}
        size="3"
        .value=${this.value}
        @change=${(e: Event) =>
          this.emit(e, (e.target as HTMLInputElement).value)}
      ></vscode-textfield>
    `;
  }

  private emit(e: Event, value: string) {
    e.stopPropagation();
    this.dispatchEvent(new ColorFieldChangeEvent(value));
  }
}

let probe: CanvasRenderingContext2D | null | undefined;

/** Any CSS colour (OpenSCAD names are CSS names) → `#rrggbb` for the swatch. */
function toHex(color: string): string {
  probe ??= document.createElement("canvas").getContext("2d");
  if (!probe) return "#000000";
  probe.fillStyle = "#000000";
  probe.fillStyle = color.trim();
  const normalized = String(probe.fillStyle);
  return normalized.startsWith("#") ? normalized : "#000000";
}
