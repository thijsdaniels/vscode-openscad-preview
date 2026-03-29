import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { Color } from "three";
import { modelContext, ModelContext } from "../../contexts/ModelContext";
import {
  measurementContext,
  MeasurementContext,
} from "../../contexts/MeasurementContext";
import {
  viewSettingsContext,
  ViewSettingsContext,
} from "../../contexts/ViewSettingsContext";
import { Stage, Theme } from "./Stage";

declare global {
  interface HTMLElementTagNameMap {
    "scad-preview": Preview;
  }
}

@customElement("scad-preview")
export class Preview extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }

    #canvas-container {
      width: 100%;
      height: 100%;
      display: block;
    }

    .main-canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }

    #loading-overlay {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      z-index: 1000;
      color: var(--vscode-foreground);
      background: rgba(0, 0, 0, 0.15);
      border-radius: 0.25rem;
      padding: 0.75rem 1rem 0.75rem 0.75rem;
      pointer-events: none;
    }

    .spinner {
      border: 2px solid
        var(--vscode-editorGhostText-border, rgba(255, 255, 255, 0.1));
      border-top: 2px solid var(--vscode-button-background);
      border-radius: 50%;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `;

  @consume({ context: viewSettingsContext, subscribe: true })
  @state()
  viewSettingsContext!: ViewSettingsContext;

  @consume({ context: modelContext, subscribe: true })
  @state()
  modelContext!: ModelContext;

  @consume({ context: measurementContext, subscribe: true })
  @state()
  measurementContext!: MeasurementContext;

  @query("#canvas-container")
  private container!: HTMLElement;

  private stage?: Stage;
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private theme: Theme = getTheme();

  firstUpdated() {
    this.initStage();
    this.setupResizeObserver();
    this.setupThemeObserver();
  }

  initStage() {
    this.stage = new Stage(this.container, this.theme);

    // Setup measurement callbacks
    this.stage.setMeasurementCallbacks(
      (point) => this.measurementContext.setHoveredPoint(point),
      (point) => {
        if (!point) return;
        const { nextPointToSet } = this.measurementContext.measurement;
        if (nextPointToSet === "A") {
          this.measurementContext.setPointA(point);
        } else {
          this.measurementContext.setPointB(point);
        }
      },
    );

    // Process any state that arrived before initialization
    if (this.viewSettingsContext) {
      this.stage.applySettings(this.viewSettingsContext);
    }

    if (this.modelContext?.base64Data) {
      this.stage.loadModelData(this.modelContext);
    }
  }

  // Bridging the declarative Lit cycle with the imperative Three.js cycle
  updated(changedProperties: Map<string, unknown>) {
    if (!this.stage) return;

    if (
      changedProperties.has("viewSettingsContext") &&
      this.viewSettingsContext
    ) {
      this.stage.applySettings(this.viewSettingsContext);
      /**
       * @todo I am brute forcing a rerender of the model here because the
       * theme update causes the environment to be recreated, and since those
       * materials no longer have depthTest set to false, the model is hidden
       * behind the environment otherwise. We need to find a better solution.
       */
      this.stage.loadModelData(this.modelContext);
    }

    if (changedProperties.has("modelContext") && this.modelContext) {
      this.stage.loadModelData(this.modelContext);
    }

    if (
      changedProperties.has("measurementContext") &&
      this.measurementContext
    ) {
      this.stage.setMeasurementEnabled(this.measurementContext.isActive);
      this.stage.setMeasurementSnappingMode(
        this.measurementContext.snappingMode,
      );
      this.stage.setMeasurementPointA(
        this.measurementContext.measurement.pointA,
      );
      this.stage.setMeasurementPointB(
        this.measurementContext.measurement.pointB,
      );
      this.stage.setMeasurementPointHovered(
        this.measurementContext.measurement.hoveredPoint,
      );
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }

    if (this.stage) {
      this.stage.dispose();
    }
  }

  private setupThemeObserver() {
    this.themeObserver = new MutationObserver(() => {
      this.theme = getTheme();

      if (this.stage) {
        this.stage.updateTheme(this.theme);
        /**
         * @todo I am brute forcing a rerender of the model here because the
         * theme update causes the environment to be recreated, and since those
         * materials no longer have depthTest set to false, the model is hidden
         * behind the environment otherwise. We need to find a better solution.
         */
        this.stage.loadModelData(this.modelContext);
      }
    });

    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-vscode-theme"],
    });
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.container && this.stage) {
        this.stage.resize(
          this.container.clientWidth,
          this.container.clientHeight,
        );
      }
    });

    this.resizeObserver.observe(this.container);
  }

  render() {
    return html`
      ${this.modelContext?.isLoading || !this.modelContext?.base64Data
        ? html`
            <div id="loading-overlay">
              <div class="spinner"></div>
              <div>
                ${this.modelContext?.loadingMessage ?? "Rendering SCAD..."}
              </div>
            </div>
          `
        : ""}
      <div id="canvas-container"></div>
    `;
  }
}

function getTheme(): Theme {
  const styles = getComputedStyle(document.body);

  const background = new Color(
    styles.getPropertyValue("--vscode-editor-background").trim(),
  );

  const fog = background.clone();

  const gridMajor = background
    .clone()
    .lerp(
      new Color(styles.getPropertyValue("--vscode-editor-foreground").trim()),
      isDark(background) ? 0.15 : 0.5,
    );

  const gridMinor = background
    .clone()
    .lerp(
      new Color(styles.getPropertyValue("--vscode-editor-foreground").trim()),
      isDark(background) ? 0.05 : 0.35,
    );

  const plate = new Color(
    styles.getPropertyValue("--vscode-button-secondaryBackground").trim(),
  );

  const plateGrid = plate
    .clone()
    .lerp(
      new Color(
        styles.getPropertyValue("--vscode-button-secondaryForeground").trim(),
      ),
      0.05,
    );

  const additive = new Color(
    styles.getPropertyValue("--vscode-editor-foreground").trim(),
  );

  const subtractive = new Color(
    styles.getPropertyValue("--vscode-editor-foreground").trim(),
  );

  const accent = new Color(
    styles.getPropertyValue("--vscode-button-background").trim(),
  );

  return {
    background,
    fog,
    gridMajor,
    gridMinor,
    plate,
    plateGrid,
    additive,
    subtractive,
    accent,
  };
}

function isDark(color: Color) {
  return color.r * 0.299 + color.g * 0.587 + color.b * 0.114 < 0.5;
}
