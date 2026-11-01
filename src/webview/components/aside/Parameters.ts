import { consume } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  ScadParameter,
  StringParameter,
} from "../../../shared/types/ScadParameter";
import { StringEditor } from "../../../shared/types/StringEditor";
import { ColorFieldChangeEvent } from "../atoms/ColorField";
import { IconName } from "../atoms/Icon";
import { NumberFieldChangeEvent } from "../atoms/NumberField";
import { PickFieldChangeEvent } from "../atoms/PickField";
import { ModelContext, modelContext } from "../../contexts/ModelContext";
import {
  parameterContext,
  ParameterContext,
} from "../../contexts/ParameterContext";
import { MessageKey, t } from "../../i18n/t";
import {
  expandedLayout,
  GroupLayout,
  isGroupOpen,
  toggleGroup,
} from "../../services/GroupLayout";
import { CollapsibleToggleEvent } from "../atoms/Collapsible";
import "../atoms/Collapsible";
import "../atoms/ColorField";
import "../atoms/PickField";
import "../atoms/Icon";
import "../atoms/IconButton";
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
      overflow: hidden;
    }

    /* Preset bar stays put; only the parameter groups scroll. */
    .preset {
      flex-shrink: 0;
    }

    .groups {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .preset-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .preset-controls {
      flex-wrap: wrap;
    }

    /* Narrow panel: the buttons wrap below the preset list. */
    .preset-controls vscode-single-select {
      flex: 1;
      min-width: 8rem;
    }

    .preset-actions {
      display: flex;
      gap: 0.25rem;
      align-items: center;
    }

    vscode-textfield {
      width: 100%;
    }

    vscode-single-select {
      width: 100%;
    }

    .export-container {
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

  /** Owned by the side panel, whose header holds the layout buttons. */
  @property({ attribute: false })
  public groupLayout: GroupLayout = expandedLayout();

  public render() {
    const { parameters, overrides, parameterSets, activeSetName, labelMode } =
      this.parameterContext;

    const groups = this.groupParameters(parameters);
    const setNames = Object.keys(parameterSets || {});

    return html`
      <scad-collapsible class="preset" heading=${t("parameters.preset")} open>
        <div class="preset-controls">
          <vscode-single-select
            title=${t("parameters.presetSelect.tip")}
            .value=${activeSetName || ""}
            @change=${(e: Event) => {
              const val = (e.target as HTMLSelectElement).value;
              this.parameterContext.applySet(val ? val : undefined);
            }}
          >
            <vscode-option value=""
              >${t("parameters.presetNone")}</vscode-option
            >
            ${setNames.map(
              (name) =>
                html`<vscode-option value="${name}">${name}</vscode-option>`,
            )}
          </vscode-single-select>
          <div class="preset-actions">
            ${activeSetName
              ? html`
                  <scad-icon-button
                    label=${t("parameters.saveActive")}
                    tooltip=${t("parameters.saveActive.tip")}
                    @click=${() => this.parameterContext.saveSet(activeSetName)}
                  >
                    <scad-icon name="save"></scad-icon>
                  </scad-icon-button>
                  <scad-icon-button
                    label=${t("parameters.deleteActive")}
                    tooltip=${t("parameters.deleteActive.tip")}
                    @click=${() =>
                      this.parameterContext.deleteSet(activeSetName)}
                  >
                    <scad-icon name="trash"></scad-icon>
                  </scad-icon-button>
                `
              : nothing}
            <scad-icon-button
              label=${t("parameters.saveAsNew")}
              tooltip=${t("parameters.saveAsNew.tip")}
              @click=${() => this.parameterContext.saveAsNewSet()}
            >
              <scad-icon name="save-as"></scad-icon>
            </scad-icon-button>
            <scad-icon-button
              label=${t("parameters.labelDescription")}
              tooltip=${t("parameters.labelDescription.tip")}
              toggleable
              .checked=${labelMode === "description"}
              @change=${() =>
                this.parameterContext.setLabelMode(
                  labelMode === "description" ? "name" : "description",
                )}
            >
              <scad-icon name="comment"></scad-icon>
            </scad-icon-button>
          </div>
        </div>
      </scad-collapsible>
      <div class="groups">
        ${Array.from(groups.entries()).map(
          ([groupName, parameters]) => html`
            <scad-collapsible
              heading="${groupName}"
              .open=${isGroupOpen(this.groupLayout, groupName)}
              @toggle=${(e: CollapsibleToggleEvent) =>
                this.dispatchEvent(
                  new GroupLayoutChangeEvent(
                    toggleGroup(this.groupLayout, groupName, e.detail.open),
                  ),
                )}
            >
              ${parameters.map((parameter) => {
                const isOverridden = parameter.name in overrides;
                const currentValue = this.getCompoundValue(parameter);

                return html`
                  <scad-field
                    label=${(labelMode === "description" &&
                      parameter.description?.trim()) ||
                    this.formatParameterName(parameter.name, groupName)}
                    tooltip=${t(
                      "parameters.field.tip",
                      parameter.description ||
                        this.formatParameterName(parameter.name, groupName),
                      parameter.name,
                    )}
                  >
                    ${isOverridden
                      ? html`
                          <scad-icon-button
                            slot="actions"
                            label=${t("parameters.revert")}
                            tooltip=${t("parameters.revert.tip")}
                            @click=${() =>
                              this.handleInputChange(parameter.name, undefined)}
                          >
                            <scad-icon name="discard"></scad-icon>
                          </scad-icon-button>
                        `
                      : nothing}
                    ${this.renderInput(parameter, currentValue)}
                  </scad-field>
                `;
              })}
            </scad-collapsible>
          `,
        )}
      </div>
      <div class="export-container">
        <vscode-button
          title=${t("parameters.print.tip")}
          @click=${() => this.modelContext.sendToSlicer()}
        >
          ${t("parameters.print")}
        </vscode-button>
        <vscode-button
          title=${t("parameters.export.tip")}
          @click=${() => this.modelContext.export()}
        >
          ${t("parameters.export")}
        </vscode-button>
      </div>
    `;
  }

  private groupParameters(parameters: ScadParameter[]) {
    const groups = new Map<string, ScadParameter[]>();

    parameters.forEach((parameter) => {
      const group = parameter.group || t("parameters.defaultGroup");

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
          title=${t("parameters.select.tip")}
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
          title=${t("parameters.select.tip")}
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

    if (param.type === "string" && param.editor) {
      return this.renderStringEditor(param, param.editor, String(currentValue));
    }

    switch (param.type) {
      case "boolean":
        return html`
          <vscode-checkbox
            title=${t("parameters.checkbox.tip")}
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
            title=${t("parameters.text.tip")}
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

  private renderStringEditor(
    param: StringParameter,
    editor: StringEditor,
    value: string,
  ) {
    if (editor === "color") {
      return html`
        <scad-color-field
          .value=${value}
          @change=${(e: ColorFieldChangeEvent) =>
            this.handleInputChange(param.name, e.detail.value)}
        ></scad-color-field>
      `;
    }

    const button = PICK_BUTTONS[editor];
    return html`
      <scad-pick-field
        .value=${value}
        label=${t(button.label)}
        tooltip=${t(button.tooltip)}
        @change=${(e: PickFieldChangeEvent) =>
          this.handleInputChange(param.name, e.detail.value)}
        @pick=${() => this.parameterContext.pick(param.name)}
      >
        <scad-icon name=${button.icon}></scad-icon>
      </scad-pick-field>
    `;
  }
}

/** A group was opened or closed by the user; the owner stores the layout. */
export class GroupLayoutChangeEvent extends CustomEvent<{
  layout: GroupLayout;
}> {
  static readonly eventName = "group-layout-change" as const;
  constructor(layout: GroupLayout) {
    super(GroupLayoutChangeEvent.eventName, {
      detail: { layout },
      bubbles: true,
      composed: true,
    });
  }
}

/** Browse button of the editors whose box is opened by the extension. */
const PICK_BUTTONS: Record<
  Exclude<StringEditor, "color">,
  { icon: IconName; label: MessageKey; tooltip: MessageKey }
> = {
  file: {
    icon: "file",
    label: "parameters.file",
    tooltip: "parameters.file.tip",
  },
  folder: {
    icon: "folder",
    label: "parameters.folder",
    tooltip: "parameters.folder.tip",
  },
  font: {
    icon: "font",
    label: "parameters.font",
    tooltip: "parameters.font.tip",
  },
};
