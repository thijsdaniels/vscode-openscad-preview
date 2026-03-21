import { consume } from "@lit/context";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { logContext, LogContext } from "../contexts/LogContext";
import "./MaterialSymbol";

declare global {
  interface HTMLElementTagNameMap {
    "scad-debug": Debug;
  }
}

@customElement("scad-debug")
export class Debug extends LitElement {
  @consume({ context: logContext, subscribe: true })
  @state()
  logContext!: LogContext;

  public static styles = css`
    :host {
      display: flex;
      height: 100%;
      flex-direction: column;
      background: var(--vscode-panel-background);
      border-top: 1px solid var(--vscode-panel-border);
      overflow: hidden;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 12px;
      background: var(--vscode-panel-background);
      border-bottom: 1px solid var(--vscode-panel-border);
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--vscode-panelTitle-foreground);
    }

    .header-actions {
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .segment-button {
      border: 1px solid var(--vscode-input-border);
      border-right: none;
      background: transparent;
      color: var(--vscode-toolbar-foreground);
      padding: 0.15rem 0.25rem;
      font-size: 0.9rem; /* slightly smaller for panel header */
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .segment-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .segment-button.active {
      background: var(--vscode-toolbar-activeBackground);
      color: var(--vscode-toolbar-activeForeground);
    }

    .segment-button.first {
      border-top-left-radius: 0.25rem;
      border-bottom-left-radius: 0.25rem;
    }

    .segment-button.last {
      border-top-right-radius: 0.25rem;
      border-bottom-right-radius: 0.25rem;
      border-right: 1px solid var(--vscode-input-border);
    }

    .log-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px;
      font-family: var(--vscode-editor-font-family, Consolas, monospace);
      font-size: var(--vscode-editor-font-size, 12px);
      line-height: 1.4;
      white-space: normal;
      word-break: break-all;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .log-message {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px;
    }

    .log-header {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .log-icon {
      font-size: 14px;
    }

    .log-text {
      flex: 1;
    }

    .log-info {
      color: var(--vscode-editor-foreground);
      background: rgba(255, 255, 255, 0.025);
      border-left: 3px solid var(--vscode-editor-foreground);
      padding-left: 8px;
    }

    .log-warning {
      color: var(--vscode-editorWarning-foreground);
      background: rgba(204, 167, 0, 0.05);
      border-left: 3px solid var(--vscode-editorWarning-foreground);
      padding-left: 8px;
    }

    .log-error {
      color: var(--vscode-editorError-foreground);
      background: rgba(244, 135, 113, 0.05);
      border-left: 3px solid var(--vscode-editorError-foreground);
      padding-left: 8px;
    }

    .log-trace-details {
      margin-top: 4px;
    }

    .log-trace-details summary {
      cursor: pointer;
      font-size: 0.9em;
      opacity: 0.8;
      user-select: none;
      padding-left: 24px;
    }

    .log-trace {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-left: 24px;
      padding-top: 4px;
      font-size: 0.9em;
      opacity: 0.8;
    }

    .log-trace-entry {
      padding-left: 16px;
    }
  `;

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    // Auto-scroll to bottom when logs update
    if (changedProperties.has("logContext")) {
      const container = this.shadowRoot?.querySelector(".log-container");
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }

  private getIcon(level: string) {
    switch (level) {
      case "error":
        return "error";
      case "warning":
        return "warning";
      default:
        return "info";
    }
  }

  render() {
    return html`
      <div class="header">
        <span>OpenSCAD Output</span>
        <div class="header-actions">
          <button
            class=${classMap({
              "segment-button": true,
              first: true,
              active: this.logContext?.autoClear,
            })}
            title="Auto-clear on new renders"
            @click=${() => this.logContext?.toggleAutoClear()}
          >
            <material-symbol name="auto_delete"></material-symbol>
          </button>
          <button
            class=${classMap({
              "segment-button": true,
              last: true,
            })}
            title="Clear Console"
            @click=${() => this.logContext?.clear()}
          >
            <material-symbol name="clear_all"></material-symbol>
          </button>
        </div>
      </div>

      <div class="log-container">
        ${this.logContext.logs.map(
          (log) => html`
            <div class="log-message log-${log.level}" id="${log.id}">
              <div class="log-header">
                <material-symbol
                  class="log-icon"
                  name="${this.getIcon(log.level)}"
                ></material-symbol>
                <div class="log-text">${log.text}</div>
              </div>
              ${log.traces.length > 0
                ? html`
                    <details class="log-trace-details">
                      <summary>&nbsp;Show trace...</summary>
                      <div class="log-trace">
                        ${log.traces.map(
                          (t) => html`<div class="log-trace-entry">${t}</div>`,
                        )}
                      </div>
                    </details>
                  `
                : null}
            </div>
          `,
        )}
      </div>
    `;
  }
}
