import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property } from "lit/decorators.js";

declare global {
  interface HTMLElementTagNameMap {
    "scad-icon": Icon;
  }
}

const icons = {
  // Tools
  "tool-select": svg`
    <path d="M4 2 L4 13 L7.5 10 L11 14 L12.5 13 L9 9 L13 8 Z" fill="currentColor"/>
  `,
  "tool-move": svg`
    <path d="M8 2 L6 4.5 H7.25 V7.25 H4.5 V6 L2 8 L4.5 10 V8.75 H7.25 V11.5 H6 L8 14 L10 11.5 H8.75 V8.75 H11.5 V10 L14 8 L11.5 6 V7.25 H8.75 V4.5 H10 Z" fill="currentColor"/>
  `,
  "tool-rotate": svg`
    <path d="M 8 3 A 5 5 0 1 1 3 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <polygon points="3,5 5,8 1,8" fill="currentColor"/>
  `,
  "tool-scale": svg`
    <rect x="2" y="7" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="9" y1="7" x2="11.5" y2="4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <polygon points="14,2 14,7 9,2" fill="currentColor"/>
  `,
  "tool-measure": svg`
    <rect x="1" y="5" width="14" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="4" y1="5" x2="4" y2="8" stroke="currentColor" stroke-width="1"/>
    <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1"/>
    <line x1="10" y1="5" x2="10" y2="8" stroke="currentColor" stroke-width="1"/>
    <line x1="13" y1="5" x2="13" y2="9" stroke="currentColor" stroke-width="1"/>
  `,

  // Scene objects
  "camera": svg`
    <rect x="1.5" y="5" width="13" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M5.5 5 L6 3 L10 3 L10.5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="8" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,
  "cross-section": svg`
    <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="2" y1="10" x2="14" y2="5" stroke="currentColor" stroke-width="1.5"/>
  `,
  "measurement": svg`
    <rect x="1" y="5" width="14" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="4" y1="5" x2="4" y2="8" stroke="currentColor" stroke-width="1"/>
    <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" stroke-width="1"/>
    <line x1="10" y1="5" x2="10" y2="8" stroke="currentColor" stroke-width="1"/>
    <line x1="13" y1="5" x2="13" y2="9" stroke="currentColor" stroke-width="1"/>
  `,

  // Lights
  "light-ambient": svg`
    <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="8" y1="1" x2="8" y2="3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="8" y1="12.5" x2="8" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="1" y1="8" x2="3.5" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12.5" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3.05" y1="3.05" x2="4.82" y2="4.82" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="11.18" y1="11.18" x2="12.95" y2="12.95" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12.95" y1="3.05" x2="11.18" y2="4.82" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="4.82" y1="11.18" x2="3.05" y2="12.95" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  "light-directional": svg`
    <circle cx="8" cy="5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="5" y1="11" x2="5" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="8" y1="11" x2="8" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="11" y1="11" x2="11" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  "light-spot": svg`
    <circle cx="8" cy="3" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="5" y1="4.5" x2="2" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="11" y1="4.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,
  "light-point": svg`
    <circle cx="8" cy="8" r="3" fill="currentColor"/>
    <line x1="8" y1="1" x2="8" y2="3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="8" y1="12.5" x2="8" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="1" y1="8" x2="3.5" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="12.5" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  `,

  // Camera modes
  "camera-perspective": svg`
    <polygon points="5,3 11,3 13,13 3,13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="1"/>
    <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1"/>
  `,
  "camera-orthographic": svg`
    <rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1"/>
    <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1"/>
  `,

  // Render modes
  "render-solid": svg`
    <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor"/>
    <rect x="6" y="6" width="8" height="8" rx="1" fill="currentColor"/>
  `,
  "render-xray": svg`
    <defs>
      <clipPath id="scad-icon-xray-clip">
        <rect x="6" y="6" width="8" height="8" rx="1"/>
      </clipPath>
    </defs>
    <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" opacity="0.35"/>
    <rect x="6" y="6" width="8" height="8" rx="1" fill="currentColor" opacity="0.35"/>
    <rect x="2" y="2" width="8" height="8" rx="1" fill="currentColor" clip-path="url(#scad-icon-xray-clip)"/>
  `,
  "render-wireframe": svg`
    <rect x="2" y="2" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="6" y="6" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,

  // Effects
  "shadows": svg`
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M 8 2 A 6 6 0 0 1 8 14 Z" fill="currentColor"/>
  `,

  // Environments
  "env-none": svg`
    <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2,2"/>
  `,
  "env-grid": svg`
    <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" stroke-width="1"/>
    <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" stroke-width="1"/>
    <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="1"/>
    <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="1"/>
  `,
  "env-build-plate": svg`
    <path d="M 4 4 L 6 4 L 6 3 L 10 3 L 10 4 L 12 4 Q 13 4 13 5 L 13 11 L 11 13 L 4 13 Q 3 13 3 12 L 3 5 Q 3 4 4 4 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  `,

  // Panels
  "panel-bottom": svg`
    <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="1.5"/>
    <rect x="3.5" y="11" width="9" height="2" fill="currentColor" rx="0.5"/>
  `,
  "panel-side": svg`
    <rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" stroke-width="1.5"/>
    <rect x="11" y="3.5" width="2" height="9" fill="currentColor" rx="0.5"/>
  `,

  // Snap modes
  "snap-vertex": svg`
    <rect x="2" y="2" width="12" height="12" rx="1.5" fill="currentColor" opacity="0.25"/>
    <circle cx="14" cy="14" r="2.5" fill="currentColor"/>
  `,
  "snap-edge": svg`
    <rect x="2" y="2" width="12" height="12" rx="1.5" fill="currentColor" opacity="0.25"/>
    <circle cx="14" cy="8" r="2.5" fill="currentColor"/>
  `,
  "snap-face": svg`
    <rect x="2" y="2" width="12" height="12" rx="1.5" fill="currentColor" opacity="0.25"/>
    <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
  `,
};

export type IconName = keyof typeof icons;

@customElement("scad-icon")
export class Icon extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }

    svg {
      display: block;
    }
  `;

  @property() name!: IconName;

  render() {
    const icon = icons[this.name];

    if (!icon) {
      return nothing;
    }

    return html`
      <svg viewBox="0 0 16 16" width="16" height="16">${icon}</svg>
    `;
  }
}
