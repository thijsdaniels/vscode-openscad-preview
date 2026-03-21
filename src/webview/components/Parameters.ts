import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ScadParameter } from "../../shared/types/ScadParameter";
import { ModelContext, modelContext } from "../contexts/ModelContext";
import {
  parameterContext,
  ParameterContext,
} from "../contexts/ParameterContext";
import "./MaterialSymbol";
import "./ScadNumberfield";

declare global {
  interface HTMLElementTagNameMap {
    "scad-parameters": Parameters;
  }
}

@customElement("scad-parameters")
export class Parameters extends LitElement {
  public static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--vscode-panel-background);
      border-left: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }

    .parameters {
      flex-grow: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .export-container {
      padding: 16px;
      border-top: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }

    .export-button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
    }

    .export-button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .export-button:active {
      background: var(--vscode-button-activeBackground);
    }

    h3 {
      font-size: 14px;
      margin: 0 0 12px 0;
      color: var(--vscode-sideBarSectionHeader-foreground);
    }

    .parameter-group {
      margin-bottom: 24px;
    }

    .parameter {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .parameter-label-container {
      width: 50%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .parameter-label {
      font-size: 12px;
    }

    .parameter-label--overridden {
      font-weight: bold;
    }

    .input-container {
      width: 50%;
    }

    vscode-textfield {
      width: 100%;
    }

    vscode-single-select {
      width: 100%;
    }
  `;

  @property({ type: Boolean })
  public open = false;

  @consume({ context: modelContext, subscribe: true })
  @state()
  private modelContext!: ModelContext;

  @consume({ context: parameterContext, subscribe: true })
  @state()
  private parameterContext!: ParameterContext;

  public render() {
    const { parameters, overrides } = this.parameterContext;

    const groups = this.groupParameters(parameters);

    return html`
      <div class="parameters">
        ${Array.from(groups.entries()).map(
          ([groupName, parameters]) => html`
            <div class="parameter-group">
              <h3>${groupName}</h3>
              ${parameters.map((parameter) => {
                const isOverridden = parameter.name in overrides;
                const currentValue = isOverridden
                  ? overrides[parameter.name]
                  : parameter.value;

                return html`
                  <div class="parameter">
                    <div class="parameter-label-container">
                      <label
                        title="${parameter.description}"
                        class=${classMap({
                          "parameter-label": true,
                          "parameter-label--overridden": isOverridden,
                        })}
                      >
                        ${this.formatParameterName(parameter.name, groupName)}
                      </label>
                      ${isOverridden
                        ? html`
                            <vscode-toolbar-button
                              icon="discard"
                              title="Revert"
                              @click=${() =>
                                this.handleInputChange(
                                  parameter.name,
                                  undefined,
                                )}
                            ></vscode-toolbar-button>
                          `
                        : nothing}
                    </div>
                    <div class="input-container">
                      ${this.renderInput(parameter, currentValue)}
                    </div>
                  </div>
                `;
              })}
            </div>
          `,
        )}
      </div>
      <div class="export-container">
        <button
          class="export-button"
          title="Export model with current parameters"
          @click=${() => this.modelContext.export()}
        >
          <material-symbol name="file_save"></material-symbol>
          Export
        </button>
      </div>
    `;
  }

  private groupParameters(parameters: ScadParameter[]) {
    const groups = new Map<string, ScadParameter[]>();

    parameters.forEach((parameter) => {
      const group = parameter.group || "Parameters";

      if (!groups.has(group)) {
        groups.set(group, []);
      }

      groups.get(group)?.push(parameter);
    });

    return groups;
  }

  private formatParameterName(paramName: string, groupName: string): string {
    const name = paramName
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/\s+/g, " ")
      .replace(new RegExp(`^${groupName}`, "i"), "");

    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  private handleInputChange(name: string, value: unknown) {
    if (this.parameterContext.override) {
      this.parameterContext.override(name, value as string);
    }
  }

  private renderInput(param: ScadParameter, currentValue: unknown) {
    if (param.type === "string" && "options" in param && param.options) {
      return html`
        <vscode-single-select
          .value=${currentValue}
          @change=${(e: Event) =>
            this.handleInputChange(
              param.name,
              (e.target as HTMLSelectElement).value,
            )}
        >
          ${param.options.map(
            (opt) => html`
              <vscode-option value="${opt.value}"
                >${opt.label || opt.value}</vscode-option
              >
            `,
          )}
        </vscode-single-select>
      `;
    }

    if (param.type === "number" && "options" in param && param.options) {
      return html`
        <vscode-single-select
          .value=${currentValue?.toString()}
          @change=${(e: Event) =>
            this.handleInputChange(
              param.name,
              parseFloat((e.target as HTMLSelectElement).value),
            )}
        >
          ${param.options.map(
            (opt) => html`
              <vscode-option value="${opt.value}"
                >${opt.label || opt.value}</vscode-option
              >
            `,
          )}
        </vscode-single-select>
      `;
    }

    switch (param.type) {
      case "boolean":
        return html`
          <vscode-checkbox
            ?indeterminate=${false}
            .checked=${currentValue}
            @change=${(e: Event) =>
              this.handleInputChange(
                param.name,
                (e.target as HTMLInputElement).checked,
              )}
          ></vscode-checkbox>
        `;
      case "number":
        return html`
          <scad-numberfield
            .value=${typeof currentValue === "number"
              ? currentValue
              : Number(currentValue) || param.min || 0}
            .min=${param.min}
            .max=${param.max}
            .step=${param.step}
            @change=${(e: CustomEvent) =>
              this.handleInputChange(param.name, e.detail.value)}
          ></scad-numberfield>
        `;
      case "string":
        return html`
          <vscode-textfield
            size="3"
            .value=${currentValue}
            @change=${(e: Event) =>
              this.handleInputChange(
                param.name,
                (e.target as HTMLInputElement).value,
              )}
          ></vscode-textfield>
        `;
      default:
        return nothing;
    }
  }
}
