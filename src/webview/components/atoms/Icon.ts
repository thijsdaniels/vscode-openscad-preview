import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { drawnIcons } from "./icons/drawnIcons";
import { fluentIcons } from "./icons/fluentIcons.generated";

declare global {
  interface HTMLElementTagNameMap {
    "scad-icon": Icon;
  }
}

const icons = { ...fluentIcons, ...drawnIcons };

export type IconName = keyof typeof icons;

@customElement("scad-icon")
export class Icon extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }

    /* Soft drop shadow: lifts the colour icons off the background. */
    svg {
      display: block;
      filter: drop-shadow(0 1px 0.6px rgb(0 0 0 / 0.35));
    }
  `;

  @property() name!: IconName;

  render() {
    const icon = icons[this.name];

    if (!icon) {
      return nothing;
    }

    return html`
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
        ${unsafeSVG(icon)}
      </svg>
    `;
  }
}
