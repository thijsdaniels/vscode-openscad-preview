import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  ViewOptionsContext,
  viewOptionsContext,
} from "../../contexts/ViewOptionsContext";
import { NumberFieldChangeEvent } from "../atoms/NumberField";
import "../atoms/Collapsible";
import "../atoms/Field";
import "../atoms/NumberField";

declare global {
  interface HTMLElementTagNameMap {
    "scad-environment": ScadEnvironment;
  }
}

@customElement("scad-environment")
export class ScadEnvironment extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
    }

  `;

  @consume({ context: viewOptionsContext, subscribe: true })
  @state()
  private viewOptions?: ViewOptionsContext;

  render() {
    if (!this.viewOptions) return html``;

    const fogDensity = this.viewOptions.get("fogDensity");

    return html`
      <scad-collapsible heading="Fog" open>
        <scad-field label="Density">
          <scad-number-field
            .value=${fogDensity}
            .min=${0}
            .max=${0.05}
            .step=${0.0001}
            @change=${(e: NumberFieldChangeEvent) =>
              this.viewOptions?.set("fogDensity", e.detail.value)}
          ></scad-number-field>
        </scad-field>
      </scad-collapsible>
    `;
  }
}
