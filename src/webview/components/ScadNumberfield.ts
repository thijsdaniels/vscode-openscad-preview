import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";

declare global {
  interface HTMLElementTagNameMap {
    "scad-numberfield": ScadNumberfield;
  }
}

@customElement("scad-numberfield")
export class ScadNumberfield extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 26px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-input-foreground);
      background-color: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 0.25rem;
      position: relative;
      cursor: ew-resize;
      user-select: none;
      box-sizing: border-box;
      outline-offset: -1px;
      overflow: hidden;
    }

    :host(:focus-within) {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .container {
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      align-items: center;
      padding: 0 6px;
      box-sizing: border-box;
    }

    .progress-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background-color: var(--vscode-button-background);
      opacity: 0.4;
      pointer-events: none;
      transform-origin: left;
    }

    .value-text {
      position: relative;
      z-index: 1;
      pointer-events: none;
    }

    input[type="number"] {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: none;
      outline: none;
      font-family: inherit;
      font-size: inherit;
      padding: 0 6px;
      margin: 0;
      z-index: 2;
    }

    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  `;

  @property({ type: Number }) value = 0;
  @property({ type: Number }) min?: number;
  @property({ type: Number }) max?: number;
  @property({ type: Number }) step?: number;

  @state() private isEditing = false;

  @query("input") private inputEl?: HTMLInputElement;

  private startX = 0;
  private startValue = 0;
  private isDragging = false;
  private hasMoved = false;

  private handlePointerDown = (e: PointerEvent) => {
    if (this.isEditing) return;

    // Primary button only
    if (e.button !== 0) return;

    this.startX = e.clientX;
    this.startValue = this.value;
    this.isDragging = true;
    this.hasMoved = false;

    e.preventDefault(); // Prevent text selection

    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.startX;
    if (Math.abs(deltaX) > 2) {
      this.hasMoved = true;
    }

    let sensitivity: number;
    if (this.min !== undefined && this.max !== undefined) {
      const range = this.max - this.min;
      const rect = this.getBoundingClientRect();
      const width = rect.width || 100;
      // 1 full width drag equals sweeping the entire numerical range
      sensitivity = range / width;
    } else {
      // Fallback relative to the step size if no constraints are given
      sensitivity = this.step !== undefined ? this.step : 1;
    }

    // Shift modifier drops sensitivity down to 10% for precision
    if (e.shiftKey) sensitivity *= 0.1;

    let newValue = this.startValue + deltaX * sensitivity;

    // Apply stepping logic
    if (this.step !== undefined) {
      const inv = 1.0 / this.step;
      newValue = Math.round(newValue * inv) / inv;
    } else {
      // Just visually avoid nasty floating point fragments
      newValue = Math.round(newValue * 1000) / 1000;
    }

    // Clamp value within explicitly set bounds
    if (this.min !== undefined) newValue = Math.max(this.min, newValue);
    if (this.max !== undefined) newValue = Math.min(this.max, newValue);

    if (newValue !== this.value) {
      this.value = newValue;
      this.fireChangeEvent();
    }
  };

  private handlePointerUp = () => {
    if (!this.isDragging) return;
    this.isDragging = false;

    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);

    if (!this.hasMoved) {
      // Intercepted as a pure click! Enter editing mode.
      this.isEditing = true;
    }
  };

  protected async updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("isEditing") && this.isEditing && this.inputEl) {
      this.inputEl.focus();
      this.inputEl.select();
    }
  }

  private commitInput() {
    if (!this.isEditing) return;
    this.isEditing = false;

    if (!this.inputEl) return;

    let newValue = parseFloat(this.inputEl.value);

    // Fallback to current value visually if NaN
    if (isNaN(newValue)) return;

    // Clamp manual entry
    if (this.min !== undefined) newValue = Math.max(this.min, newValue);
    if (this.max !== undefined) newValue = Math.min(this.max, newValue);

    if (newValue !== this.value) {
      this.value = newValue;
      this.fireChangeEvent();
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.commitInput();
    } else if (e.key === "Escape") {
      this.isEditing = false; // Cancel edit mode softly
    }
  }

  private fireChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    let percentage = 0;
    if (
      this.min !== undefined &&
      this.max !== undefined &&
      this.max > this.min
    ) {
      percentage = ((this.value - this.min) / (this.max - this.min)) * 100;
      percentage = Math.max(0, Math.min(100, percentage));
    }

    return html`
      <div class="container" @pointerdown=${this.handlePointerDown}>
        ${this.min !== undefined && this.max !== undefined
          ? html`<div class="progress-bar" style="width: ${percentage}%"></div>`
          : nothing}
        <span class="value-text">${this.value}</span>
        ${this.isEditing
          ? html`
              <input
                type="number"
                .value=${this.value.toString()}
                .min=${this.min?.toString() || ""}
                .max=${this.max?.toString() || ""}
                .step=${this.step?.toString() || "any"}
                @blur=${this.commitInput}
                @keydown=${this.handleKeyDown}
              />
            `
          : nothing}
      </div>
    `;
  }
}
