import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ScadParameter } from "../../../shared/types/ScadParameter";
import { NumberFieldChangeEvent } from "../atoms/NumberField";
import { ModelContext, modelContext } from "../../contexts/ModelContext";
import {
  parameterContext,
  ParameterContext,
} from "../../contexts/ParameterContext";
import "../atoms/Collapsible";
import "../atoms/Field";
import "../atoms/NumberField";

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
      overflow-y: auto;
    }

    .preset-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .preset-controls vscode-single-select {
      flex: 1;
    }

    .preset-actions {
      display: flex;
      gap: 0.25rem;
    }

    vscode-textfield {
      width: 100%;
    }

    vscode-single-select {
      width: 100%;
    }

    .export-container {
      position: sticky;
      bottom: 0;
      z-index: 3;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.75rem;
      background-color: color-mix(
        in hsl,
        var(--vscode-panel-background),
        var(--vscode-editor-background)
      );
      border-top: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
      margin-top: auto;
    }

    .export-container vscode-button {
      flex: 1;
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
    const { parameters, overrides, parameterSets, activeSetName } =
      this.parameterContext;

    const groups = this.groupParameters(parameters);
    const setNames = Object.keys(parameterSets || {});

    return html`
      <scad-collapsible heading="Preset" open>
        <div class="preset-controls">
          <vscode-single-select
            .value=${activeSetName || ""}
            @change=${(e: Event) => {
              const val = (e.target as HTMLSelectElement).value;
              this.parameterContext.applySet(val ? val : undefined);
            }}
          >
            <vscode-option value="">None</vscode-option>
            ${setNames.map(
              (name) =>
                html`<vscode-option value="${name}">${name}</vscode-option>`,
            )}
          </vscode-single-select>
          <div class="preset-actions">
            ${activeSetName
              ? html`
                  <vscode-toolbar-button
                    icon="save"
                    title="Save Active Preset"
                    @click=${() => this.parameterContext.saveSet(activeSetName)}
                  ></vscode-toolbar-button>
                  <vscode-toolbar-button
                    icon="trash"
                    title="Delete Active Preset"
                    @click=${() =>
                      this.parameterContext.deleteSet(activeSetName)}
                  ></vscode-toolbar-button>
                `
              : nothing}
            <vscode-toolbar-button
              icon="save-as"
              title="Save as New Preset"
              @click=${() => this.parameterContext.saveAsNewSet()}
            ></vscode-toolbar-button>
          </div>
        </div>
      </scad-collapsible>
      ${Array.from(groups.entries()).map(
        ([groupName, parameters]) => html`
          <scad-collapsible heading="${groupName}" open>
            ${parameters.map((parameter) => {
              const isOverridden = parameter.name in overrides;
              const currentValue = this.getCompoundValue(parameter);

              return html`
                <scad-field
                  label=${this.formatParameterName(parameter.name, groupName)}
                  title=${parameter.description}
                >
                  ${isOverridden
                    ? html`
                        <vscode-toolbar-button
                          slot="actions"
                          icon="discard"
                          title="Revert"
                          @click=${() =>
                            this.handleInputChange(parameter.name, undefined)}
                        ></vscode-toolbar-button>
                      `
                    : nothing}
                  ${this.renderInput(parameter, currentValue)}
                </scad-field>
              `;
            })}
          </scad-collapsible>
        `,
      )}
      <div class="export-container">
        <vscode-button
          title="Send Model to 3D Slicer"
          @click=${() => this.modelContext.sendToSlicer()}
        >
          Print
        </vscode-button>
        <vscode-button
          title="Write Model to File System"
          @click=${() => this.modelContext.export()}
        >
          Export
        </vscode-button>
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

  private getCompoundValue(param: ScadParameter): string | number | boolean {
    const { parameterSets, activeSetName, overrides } = this.parameterContext;
    if (param.name in overrides) {
      return overrides[param.name];
    }
    if (
      activeSetName &&
      parameterSets &&
      parameterSets[activeSetName] &&
      param.name in parameterSets[activeSetName]
    ) {
      const rawStr = parameterSets[activeSetName][param.name];
      if (typeof param.value === "number") return Number(rawStr);
      if (typeof param.value === "boolean") return rawStr === "true";
      return rawStr;
    }
    return param.value;
  }

  private handleInputChange(name: string, value: unknown) {
    if (this.parameterContext.override) {
      this.parameterContext.override(name, value as string | number | boolean);
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
          <scad-number-field
            .value=${typeof currentValue === "number"
              ? currentValue
              : Number(currentValue) || param.min || 0}
            .min=${param.min}
            .max=${param.max}
            .step=${param.step}
            @change=${(e: NumberFieldChangeEvent) =>
              this.handleInputChange(param.name, e.detail.value)}
          ></scad-number-field>
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
