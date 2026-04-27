import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  SelectedObjectContext,
  selectedObjectContext,
} from "../../contexts/SelectedObjectContext";
import {
  NumberFieldChangeEvent,
  NumberFieldInputEvent,
} from "../atoms/NumberField";
import "../atoms/Field";

declare global {
  interface HTMLElementTagNameMap {
    "scad-object-properties": ObjectProperties;
  }
}

@customElement("scad-object-properties")
export class ObjectProperties extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
    }

    .empty-state {
      display: flex;
      height: 100%;
      align-items: center;
      justify-content: center;
      flex: 1;
      font-size: 12px;
      opacity: 0.5;
      padding: 1rem;
      text-align: center;
    }
  `;

  @consume({ context: selectedObjectContext, subscribe: true })
  @state()
  private selectedObjectContext!: SelectedObjectContext;

  render() {
    const { properties } = this.selectedObjectContext ?? {};

    if (!properties) {
      return html`<div class="empty-state">No object selected.</div>`;
    }

    if (properties.type === "cross-section-plane") {
      return html`
        <scad-collapsible heading="Position" open>
          ${this.renderField("X", "positionX", properties.positionX)}
          ${this.renderField("Y", "positionY", properties.positionY)}
          ${this.renderField("Z", "positionZ", properties.positionZ)}
        </scad-collapsible>
        <scad-collapsible heading="Rotation" open>
          ${this.renderField("X", "rotationX", properties.rotationX, -180, 180)}
          ${this.renderField("Y", "rotationY", properties.rotationY, -180, 180)}
          ${this.renderField("Z", "rotationZ", properties.rotationZ, -180, 180)}
        </scad-collapsible>
      `;
    }

    if (properties.type === "ambient-light") {
      return html`
        <scad-collapsible heading="Light" open>
          ${this.renderField(
            "Intensity",
            "intensity",
            properties.intensity,
            0,
            10,
            0.01,
          )}
        </scad-collapsible>
      `;
    }

    if (properties.type === "directional-light") {
      return html`
        <scad-collapsible heading="Position" open>
          ${this.renderField("X", "positionX", properties.positionX)}
          ${this.renderField("Y", "positionY", properties.positionY)}
          ${this.renderField("Z", "positionZ", properties.positionZ)}
        </scad-collapsible>
        <scad-collapsible heading="Light" open>
          ${this.renderField(
            "Intensity",
            "intensity",
            properties.intensity,
            0,
            10,
            0.01,
          )}
        </scad-collapsible>
      `;
    }

    if (properties.type === "spot-light") {
      return html`
        <scad-collapsible heading="Position" open>
          ${this.renderField("X", "positionX", properties.positionX)}
          ${this.renderField("Y", "positionY", properties.positionY)}
          ${this.renderField("Z", "positionZ", properties.positionZ)}
        </scad-collapsible>
        <scad-collapsible heading="Light" open>
          ${this.renderField(
            "Intensity",
            "intensity",
            properties.intensity,
            0,
            10,
            0.01,
          )}
          ${this.renderField("Angle", "angle", properties.angle, 0, 90, 0.1)}
          ${this.renderField(
            "Penumbra",
            "penumbra",
            properties.penumbra,
            0,
            1,
            0.01,
          )}
        </scad-collapsible>
      `;
    }

    if (properties.type === "camera") {
      return html`
        <scad-collapsible heading="Position" open>
          ${this.renderField("X", "positionX", properties.positionX)}
          ${this.renderField("Y", "positionY", properties.positionY)}
          ${this.renderField("Z", "positionZ", properties.positionZ)}
        </scad-collapsible>
        <scad-collapsible heading="Rotation" open>
          ${this.renderDisplayField("X", properties.rotationX, "°")}
          ${this.renderDisplayField("Y", properties.rotationY, "°")}
          ${this.renderDisplayField("Z", properties.rotationZ, "°")}
        </scad-collapsible>
        <scad-collapsible heading="Lens" open>
          ${this.renderField("FOV", "fov", properties.fov, 1, 170, 1)}
        </scad-collapsible>
      `;
    }

    if (properties.type === "point-light") {
      return html`
        <scad-collapsible heading="Position" open>
          ${this.renderField("X", "positionX", properties.positionX)}
          ${this.renderField("Y", "positionY", properties.positionY)}
          ${this.renderField("Z", "positionZ", properties.positionZ)}
        </scad-collapsible>
        <scad-collapsible heading="Light" open>
          ${this.renderField(
            "Intensity",
            "intensity",
            properties.intensity,
            0,
            10,
            0.01,
          )}
          ${this.renderField("Decay", "decay", properties.decay, 0, 10, 0.01)}
        </scad-collapsible>
      `;
    }

    if (properties.type === "measurement") {
      return html`
        <scad-collapsible heading="Point A" open>
          ${this.renderDisplayField("X", properties.pointAX, " mm")}
          ${this.renderDisplayField("Y", properties.pointAY, " mm")}
          ${this.renderDisplayField("Z", properties.pointAZ, " mm")}
        </scad-collapsible>
        <scad-collapsible heading="Point B" open>
          ${this.renderDisplayField("X", properties.pointBX, " mm")}
          ${this.renderDisplayField("Y", properties.pointBY, " mm")}
          ${this.renderDisplayField("Z", properties.pointBZ, " mm")}
        </scad-collapsible>
        <scad-collapsible heading="Distance" open>
          ${this.renderDisplayField("ΔX", properties.deltaX, " mm")}
          ${this.renderDisplayField("ΔY", properties.deltaY, " mm")}
          ${this.renderDisplayField("ΔZ", properties.deltaZ, " mm")}
          ${this.renderDisplayField("Total", properties.distance, " mm")}
        </scad-collapsible>
      `;
    }

    return nothing;
  }

  private renderDisplayField(label: string, value: number, suffix = "") {
    return html`
      <scad-field label=${label}>
        <scad-number-field
          readonly
          .value=${value}
          suffix=${suffix}
        ></scad-number-field>
      </scad-field>
    `;
  }

  private renderField(
    label: string,
    key: string,
    value: number,
    min?: number,
    max?: number,
    step = 0.1,
  ) {
    return html`
      <scad-field label=${label}>
        <scad-number-field
          .value=${value}
          .min=${min}
          .max=${max}
          .step=${step}
          @input=${(e: NumberFieldInputEvent) =>
            this.selectedObjectContext.setProperty(key, e.detail.value)}
          @change=${(e: NumberFieldChangeEvent) =>
            this.selectedObjectContext.setProperty(key, e.detail.value)}
        ></scad-number-field>
      </scad-field>
    `;
  }
}
