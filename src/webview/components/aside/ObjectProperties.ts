import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  SelectedObjectContext,
  selectedObjectContext,
} from "../../contexts/SelectedObjectContext";
import { MessageKey, t } from "../../i18n/t";
import {
  NumberFieldChangeEvent,
  NumberFieldInputEvent,
} from "../atoms/NumberField";
import "../atoms/Field";
import "../atoms/ValueBox";

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
      return html`<div class="empty-state">${t("properties.empty")}</div>`;
    }

    if (properties.type === "cross-section-plane") {
      return html`
        ${this.renderPosition(properties)}
        <scad-collapsible heading=${t("properties.rotation")} open>
          ${this.renderField(
            "X",
            "rotationX",
            properties.rotationX,
            "properties.rotationX.tip",
            -180,
            180,
          )}
          ${this.renderField(
            "Y",
            "rotationY",
            properties.rotationY,
            "properties.rotationY.tip",
            -180,
            180,
          )}
          ${this.renderField(
            "Z",
            "rotationZ",
            properties.rotationZ,
            "properties.rotationZ.tip",
            -180,
            180,
          )}
        </scad-collapsible>
      `;
    }

    if (properties.type === "ambient-light") {
      return html`
        <scad-collapsible heading=${t("properties.light")} open>
          ${this.renderIntensity(properties.intensity)}
        </scad-collapsible>
      `;
    }

    if (properties.type === "directional-light") {
      return html`
        ${this.renderPosition(properties)}
        <scad-collapsible heading=${t("properties.light")} open>
          ${this.renderIntensity(properties.intensity)}
        </scad-collapsible>
      `;
    }

    if (properties.type === "spot-light") {
      return html`
        ${this.renderPosition(properties)}
        <scad-collapsible heading=${t("properties.light")} open>
          ${this.renderIntensity(properties.intensity)}
          ${this.renderField(
            t("properties.angle"),
            "angle",
            properties.angle,
            "properties.angle.tip",
            0,
            90,
            0.1,
          )}
          ${this.renderField(
            t("properties.penumbra"),
            "penumbra",
            properties.penumbra,
            "properties.penumbra.tip",
            0,
            1,
            0.01,
          )}
        </scad-collapsible>
      `;
    }

    if (properties.type === "camera") {
      return html`
        ${this.renderPosition(properties)}
        <scad-collapsible heading=${t("properties.rotation")} open>
          ${this.renderDisplayField(
            "X",
            properties.rotationX,
            "°",
            "properties.rotationX.tip",
          )}
          ${this.renderDisplayField(
            "Y",
            properties.rotationY,
            "°",
            "properties.rotationY.tip",
          )}
          ${this.renderDisplayField(
            "Z",
            properties.rotationZ,
            "°",
            "properties.rotationZ.tip",
          )}
        </scad-collapsible>
        <scad-collapsible heading=${t("properties.lens")} open>
          ${this.renderField(
            t("properties.fov"),
            "fov",
            properties.fov,
            "properties.fov.tip",
            1,
            170,
            1,
          )}
        </scad-collapsible>
      `;
    }

    if (properties.type === "point-light") {
      return html`
        ${this.renderPosition(properties)}
        <scad-collapsible heading=${t("properties.light")} open>
          ${this.renderIntensity(properties.intensity)}
          ${this.renderField(
            t("properties.decay"),
            "decay",
            properties.decay,
            "properties.decay.tip",
            0,
            10,
            0.01,
          )}
        </scad-collapsible>
      `;
    }

    if (properties.type === "measurement") {
      return html`
        <scad-collapsible heading=${t("properties.pointA")} open>
          ${this.renderDisplayField(
            "X",
            properties.pointAX,
            " mm",
            "properties.pointA.tip",
          )}
          ${this.renderDisplayField(
            "Y",
            properties.pointAY,
            " mm",
            "properties.pointA.tip",
          )}
          ${this.renderDisplayField(
            "Z",
            properties.pointAZ,
            " mm",
            "properties.pointA.tip",
          )}
        </scad-collapsible>
        <scad-collapsible heading=${t("properties.pointB")} open>
          ${this.renderDisplayField(
            "X",
            properties.pointBX,
            " mm",
            "properties.pointB.tip",
          )}
          ${this.renderDisplayField(
            "Y",
            properties.pointBY,
            " mm",
            "properties.pointB.tip",
          )}
          ${this.renderDisplayField(
            "Z",
            properties.pointBZ,
            " mm",
            "properties.pointB.tip",
          )}
        </scad-collapsible>
        <scad-collapsible heading=${t("properties.distance")} open>
          ${this.renderDisplayField(
            "ΔX",
            properties.deltaX,
            " mm",
            "properties.delta.tip",
          )}
          ${this.renderDisplayField(
            "ΔY",
            properties.deltaY,
            " mm",
            "properties.delta.tip",
          )}
          ${this.renderDisplayField(
            "ΔZ",
            properties.deltaZ,
            " mm",
            "properties.delta.tip",
          )}
          ${this.renderDisplayField(
            t("properties.total"),
            properties.distance,
            " mm",
            "properties.total.tip",
          )}
        </scad-collapsible>
      `;
    }

    if (properties.type === "model-part") {
      return html`
        <scad-collapsible heading=${t("properties.part")} open>
          <scad-field
            label=${t("properties.name")}
            tooltip=${t("properties.name.tip")}
          >
            <scad-value-box .text=${properties.name}></scad-value-box>
          </scad-field>
          <scad-field
            label=${t("properties.colors")}
            tooltip=${t("properties.colors.tip")}
          >
            <scad-value-box
              .colors=${properties.colors}
              .text=${properties.colors.join(", ") ||
              t("properties.colors.none")}
            ></scad-value-box>
          </scad-field>
          <scad-field
            label=${t("properties.triangles")}
            tooltip=${t("properties.triangles.tip")}
          >
            <scad-value-box
              .text=${properties.triangles.toLocaleString()}
            ></scad-value-box>
          </scad-field>
        </scad-collapsible>
        <scad-collapsible heading=${t("properties.size")} open>
          ${this.renderDisplayField(
            "X",
            properties.sizeX,
            " mm",
            "properties.sizeX.tip",
          )}
          ${this.renderDisplayField(
            "Y",
            properties.sizeY,
            " mm",
            "properties.sizeY.tip",
          )}
          ${this.renderDisplayField(
            "Z",
            properties.sizeZ,
            " mm",
            "properties.sizeZ.tip",
          )}
        </scad-collapsible>
        <scad-collapsible heading=${t("properties.inspect")}>
          ${this.renderField(
            "X",
            "positionX",
            properties.positionX,
            "properties.inspectPosition.tip",
          )}
          ${this.renderField(
            "Y",
            "positionY",
            properties.positionY,
            "properties.inspectPosition.tip",
          )}
          ${this.renderField(
            "Z",
            "positionZ",
            properties.positionZ,
            "properties.inspectPosition.tip",
          )}
          ${this.renderField(
            `${t("properties.rotation")} X`,
            "rotationX",
            properties.rotationX,
            "properties.inspectRotation.tip",
            -180,
            180,
          )}
          ${this.renderField(
            `${t("properties.rotation")} Y`,
            "rotationY",
            properties.rotationY,
            "properties.inspectRotation.tip",
            -180,
            180,
          )}
          ${this.renderField(
            `${t("properties.rotation")} Z`,
            "rotationZ",
            properties.rotationZ,
            "properties.inspectRotation.tip",
            -180,
            180,
          )}
        </scad-collapsible>
      `;
    }

    return nothing;
  }

  /** Position section shared by every positionable object. */
  private renderPosition(properties: {
    positionX: number;
    positionY: number;
    positionZ: number;
  }) {
    return html`
      <scad-collapsible heading=${t("properties.position")} open>
        ${this.renderField(
          "X",
          "positionX",
          properties.positionX,
          "properties.positionX.tip",
        )}
        ${this.renderField(
          "Y",
          "positionY",
          properties.positionY,
          "properties.positionY.tip",
        )}
        ${this.renderField(
          "Z",
          "positionZ",
          properties.positionZ,
          "properties.positionZ.tip",
        )}
      </scad-collapsible>
    `;
  }

  private renderIntensity(value: number) {
    return this.renderField(
      t("properties.intensity"),
      "intensity",
      value,
      "properties.intensity.tip",
      0,
      10,
      0.01,
    );
  }

  private renderDisplayField(
    label: string,
    value: number,
    suffix: string,
    tip: MessageKey,
  ) {
    return html`
      <scad-field label=${label} tooltip=${t(tip)}>
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
    tip: MessageKey,
    min?: number,
    max?: number,
    step = 0.1,
  ) {
    return html`
      <scad-field label=${label} tooltip=${t(tip)}>
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
