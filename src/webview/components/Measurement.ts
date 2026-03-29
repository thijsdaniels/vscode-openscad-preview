import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import {
  measurementContext,
  MeasurementContext,
  SnappingMode,
} from "../contexts/MeasurementContext";

declare global {
  interface HTMLElementTagNameMap {
    "scad-measurement": Measurement;
  }
}

@customElement("scad-measurement")
export class Measurement extends LitElement {
  public static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--vscode-editor-background);
      border-left: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }

    .measurement-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 1rem;
      gap: 1rem;
    }

    .measurement-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .measurement-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: bold;
    }

    .control-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .control-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      opacity: 0.8;
    }

    .snapping-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .snapping-buttons vscode-button {
      flex: 1;
    }

    .snapping-buttons vscode-button.active {
      --button-primary-background: var(--vscode-button-background);
      --button-primary-foreground: var(--vscode-button-foreground);
      --button-primary-hover-background: var(--vscode-button-hoverBackground);
    }

    .point-display {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
    }

    .point-label {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 0.25rem;
    }

    .point-coords {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 12px;
      font-family: monospace;
    }

    .coord {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .coord-label {
      opacity: 0.7;
      min-width: 20px;
    }

    .coord-value {
      font-weight: 500;
      text-align: right;
    }

    .measurement-results {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--vscode-textBlockQuote-background);
      border: 1px solid var(--vscode-textBlockQuote-border);
      border-radius: 4px;
    }

    .result-title {
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      opacity: 0.8;
    }

    .result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      font-size: 12px;
    }

    .result-label {
      opacity: 0.8;
    }

    .result-value {
      font-weight: 600;
      font-family: monospace;
      text-align: right;
      min-width: 100px;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: auto;
    }

    .action-buttons vscode-button {
      flex: 1;
    }

    .status-overlay {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      padding: 0.75rem 1rem;
      background: var(--vscode-editorHoverWidget-background);
      border: 1px solid var(--vscode-editorHoverWidget-border);
      border-radius: 4px;
      font-size: 12px;
      z-index: 100;
      pointer-events: none;
    }

    .status-text {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-testing-runAction);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--vscode-editorGhostText-foreground);
      font-size: 12px;
      text-align: center;
      gap: 1rem;
    }
  `;

  @consume({ context: measurementContext, subscribe: true })
  @state()
  private measurementContext!: MeasurementContext;

  render() {
    const { isActive, snappingMode, measurement } = this.measurementContext;

    if (!isActive) {
      return html`
        <div class="measurement-container">
          <div class="measurement-header">
            <h3>Measurement Tool</h3>
          </div>
          <div class="empty-state">
            <div>Measurement tool is inactive</div>
            <div style="opacity: 0.6; font-size: 11px;">
              Enable it from the toolbar to get started
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="measurement-container">
        <div class="measurement-header">
          <h3>Measurement</h3>
          <vscode-toolbar-button
            icon="close"
            title="Close"
            @click=${() => this.measurementContext.setActive(false)}
          ></vscode-toolbar-button>
        </div>

        <div class="control-section">
          <div class="control-label">Snapping Mode</div>
          <div class="snapping-buttons">
            ${[SnappingMode.Vertex, SnappingMode.Edge, SnappingMode.Face].map(
              (mode) => {
                const isSelected = snappingMode === mode;
                return html`
                  <vscode-button
                    ?secondary=${!isSelected}
                    @click=${() =>
                      this.measurementContext.setSnappingMode(mode)}
                  >
                    ${mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </vscode-button>
                `;
              },
            )}
          </div>
        </div>

        ${this.renderPointsSection()} ${this.renderMeasurementResults()}

        <div class="action-buttons">
          <vscode-button
            secondary
            @click=${() => this.measurementContext.reset()}
          >
            Reset
          </vscode-button>
        </div>
      </div>
    `;
  }

  private renderPointsSection() {
    const { pointA, pointB, hoveredPoint } =
      this.measurementContext.measurement;

    return html`
      <div class="control-section">
        <div class="control-label">Points</div>
        ${this.renderPoint("Point A", pointA)}
        ${this.renderPoint("Point B", pointB)}
        ${hoveredPoint && !pointA
          ? this.renderPoint("Hovered", hoveredPoint, true)
          : nothing}
      </div>
    `;
  }

  private renderPoint(
    label: string,
    point: { x: number; y: number; z: number } | null,
    isHovered = false,
  ) {
    return html`
      <div class="point-display">
        <div class="point-label" style=${isHovered ? "opacity: 0.5;" : ""}>
          ${label}${isHovered ? " (Preview)" : ""}
        </div>
        ${point
          ? html`
              <div class="point-coords">
                <div class="coord">
                  <span class="coord-label">X:</span>
                  <span class="coord-value">${point.x.toFixed(2)} mm</span>
                </div>
                <div class="coord">
                  <span class="coord-label">Y:</span>
                  <span class="coord-value">${point.y.toFixed(2)} mm</span>
                </div>
                <div class="coord">
                  <span class="coord-label">Z:</span>
                  <span class="coord-value">${point.z.toFixed(2)} mm</span>
                </div>
              </div>
            `
          : html`<div style="opacity: 0.5; font-size: 12px;">Not set</div>`}
      </div>
    `;
  }

  private renderMeasurementResults() {
    const { pointA, pointB, deltaX, deltaY, deltaZ, distance } =
      this.measurementContext.measurement;

    if (!pointA || !pointB) {
      return nothing;
    }

    return html`
      <div class="measurement-results">
        <div class="result-title">Distances</div>
        <div class="result-item">
          <span class="result-label">ΔX:</span>
          <span class="result-value">${deltaX?.toFixed(2)} mm</span>
        </div>
        <div class="result-item">
          <span class="result-label">ΔY:</span>
          <span class="result-value">${deltaY?.toFixed(2)} mm</span>
        </div>
        <div class="result-item">
          <span class="result-label">ΔZ:</span>
          <span class="result-value">${deltaZ?.toFixed(2)} mm</span>
        </div>
        <div
          class="result-item"
          style="border-top: 1px solid var(--vscode-panel-border); padding-top: 0.75rem; margin-top: 0.75rem;"
        >
          <span class="result-label">Diagonal:</span>
          <span class="result-value">${distance?.toFixed(2)} mm</span>
        </div>
      </div>
    `;
  }
}
