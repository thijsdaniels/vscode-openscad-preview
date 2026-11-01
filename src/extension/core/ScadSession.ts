import { EventEmitter, Memento, Uri, workspace } from "vscode";
import { ModelFormat } from "../../shared/types/ModelFormat";
import { ScadParameter } from "../../shared/types/ScadParameter";
import { ScadClient } from "../services/ScadClient";
import { ScadParser } from "../services/ScadParser";
import { ScadRenderer } from "../services/ScadRenderer";
import { FileWatcher } from "../services/ScadWatcher";
import { ScadParameters } from "./ScadParameters";

/**
 * Represents a single SCAD document session.
 * Decouples the file watching and parameter parsing from any specific Webview Panel UI.
 */
export class ScadSession {
  private scadWatcher: FileWatcher;
  private jsonWatcher?: FileWatcher;
  private scadParameters: ScadParameters;
  private scadRenderer: ScadRenderer;

  // Events that Views can subscribe to
  private _onRenderCompleted = new EventEmitter<{
    buffer: Buffer;
    format: ModelFormat;
  }>();
  public readonly onRenderCompleted = this._onRenderCompleted.event;

  private _onParametersChanged = new EventEmitter<{
    parameters: ScadParameter[];
    parameterSets: Record<string, Record<string, string>>;
    activeSetName: string | undefined;
    overrides: Record<string, string | number | boolean>;
  }>();
  public readonly onParametersChanged = this._onParametersChanged.event;

  private _onRenderStarted = new EventEmitter<void>();
  public readonly onRenderStarted = this._onRenderStarted.event;

  private _onRenderError = new EventEmitter<Error>();
  public readonly onRenderError = this._onRenderError.event;

  private _onLog = new EventEmitter<string>();
  public readonly onLog = this._onLog.event;

  private _onAutoRenderChanged = new EventEmitter<{
    enabled: boolean;
    pending: boolean;
  }>();
  public readonly onAutoRenderChanged = this._onAutoRenderChanged.event;

  // When latched on (default), every change is rendered at once; when off,
  // file and parameter changes are queued until the user asks for a render.
  private _autoRender = true;
  private renderPending = false;
  // The first render (at launch) always happens, whatever the mode.
  private hasRendered = false;

  private _onExplodeChanged = new EventEmitter<boolean>();
  public readonly onExplodeChanged = this._onExplodeChanged.event;

  // Exploded (lazy union): one part per top-level object. Remembered per file.
  private _explode: boolean;

  private get explodeStateKey(): string {
    return `openscad.explode.${this.documentUri.toString()}`;
  }

  constructor(
    public readonly documentUri: Uri,
    private readonly workspaceState: Memento,
  ) {
    // Read before the watcher starts: its first change triggers a render.
    this._explode = workspaceState.get<boolean>(this.explodeStateKey, false);

    this.scadRenderer = new ScadRenderer({
      onStart: () => this._onRenderStarted.fire(),
      onComplete: (data) => this._onRenderCompleted.fire(data),
      onError: (err) => this._onRenderError.fire(err),
      onLog: (chunk) => this._onLog.fire(chunk),
    });

    // Manager for current parameter values and overrides.
    this.scadParameters = new ScadParameters({
      onChange: (event) => this._onParametersChanged.fire(event),
    });

    // Watcher for file changes.
    this.scadWatcher = new FileWatcher({
      path: documentUri.fsPath,
      onChange: ({ content }) => {
        const parser = new ScadParser(content);
        this.scadParameters.updateDefinitions(parser.parameters);

        this.requestRender();
      },
    });

    this.setupJsonWatcher();
  }

  private get jsonFileUri(): Uri {
    const jsonPath = this.documentUri.fsPath.replace(/\.scad$/i, ".json");
    if (jsonPath === this.documentUri.fsPath) {
      return Uri.file(jsonPath + ".json");
    }
    return Uri.file(jsonPath);
  }

  private setupJsonWatcher() {
    this.jsonWatcher = new FileWatcher({
      path: this.jsonFileUri.fsPath,
      onChange: async ({ content }) => {
        try {
          const data = JSON.parse(content);
          if (data.parameterSets) {
            this.scadParameters.updateParameterSets(data.parameterSets);

            const oldValues = JSON.stringify(
              this.scadParameters.getActiveValues(),
            );
            const activeSetName = this.scadParameters.getActiveSetName();
            if (activeSetName) {
              if (!(activeSetName in data.parameterSets)) {
                this.applyParameterSet(undefined);
              } else {
                // Hot-reload the active set to ingest external JSON changes into the flat overrides bucket
                this.scadParameters.setActiveSet(activeSetName);

                if (
                  JSON.stringify(this.scadParameters.getActiveValues()) !==
                  oldValues
                ) {
                  this.requestRender();
                }
              }
            }
          }
        } catch {
          // ignore parsing errors
        }
      },
    });

    this.loadJson();
  }

  private async loadJson() {
    try {
      const content = await workspace.fs.readFile(this.jsonFileUri);
      const data = JSON.parse(Buffer.from(content).toString("utf-8"));
      if (data.parameterSets) {
        this.scadParameters.updateParameterSets(data.parameterSets);
      }
    } catch {
      // file doesn't exist or isn't valid JSON
    }
  }

  public get autoRender(): { enabled: boolean; pending: boolean } {
    return { enabled: this._autoRender, pending: this.renderPending };
  }

  /** Turns automatic rendering on or off; turning it on flushes pending changes. */
  public setAutoRender(enabled: boolean) {
    this._autoRender = enabled;
    if (enabled && this.renderPending) {
      this.renderPending = false;
      this.requestRender();
    }
    this._onAutoRenderChanged.fire(this.autoRender);
  }

  /** Renders the current state once, whatever the automatic mode. */
  public renderNow() {
    this.renderPending = false;
    this.hasRendered = true;
    this.scadRenderer.render(
      this.documentUri.fsPath,
      this.scadParameters.getActiveValues(),
      this._explode,
    );
    this._onAutoRenderChanged.fire(this.autoRender);
  }

  public get explode(): boolean {
    return this._explode;
  }

  /** Splits the model into its top-level parts (or merges it) and re-renders. */
  public setExplode(enabled: boolean) {
    this._explode = enabled;
    this.workspaceState.update(this.explodeStateKey, enabled);
    this._onExplodeChanged.fire(enabled);
    this.renderNow();
  }

  private requestRender() {
    if (!this._autoRender && this.hasRendered) {
      if (!this.renderPending) {
        this.renderPending = true;
        this._onAutoRenderChanged.fire(this.autoRender);
      }
      return;
    }

    this.hasRendered = true;
    this.scadRenderer.render(
      this.documentUri.fsPath,
      this.scadParameters.getActiveValues(),
      this._explode,
    );
  }

  public get currentParameters(): ScadParameter[] {
    return this.scadParameters.getParameters();
  }

  public get currentOverrides(): Record<string, string | number | boolean> {
    return this.scadParameters.getOverrides();
  }

  public get activeSetName(): string | undefined {
    return this.scadParameters.getActiveSetName();
  }

  public get currentParameterSets(): Record<string, Record<string, string>> {
    return this.scadParameters.getParameterSets();
  }

  public updateParameterValue(
    name: string,
    value: string | number | boolean | undefined,
  ) {
    this.scadParameters.updateValue(name, value);

    this.requestRender();
  }

  public async saveParameterSet(name: string) {
    const partial = this.scadParameters.calculateActiveSetPartial();

    let data: {
      parameterSets?: Record<string, Record<string, string>>;
      fileFormatVersion?: string;
      [key: string]: unknown;
    } = {};
    try {
      const content = await workspace.fs.readFile(this.jsonFileUri);
      data = JSON.parse(Buffer.from(content).toString("utf-8"));
    } catch {
      // Create fresh structure if no existing explicit file
    }

    data.parameterSets = data.parameterSets || {};
    data.parameterSets[name] = partial;
    data.fileFormatVersion = "1";

    await workspace.fs.writeFile(
      this.jsonFileUri,
      Buffer.from(JSON.stringify(data, null, 2), "utf-8"),
    );
    this.scadParameters.updateParameterSets(data.parameterSets);
    this.scadParameters.setActiveSet(name);
  }

  public async deleteParameterSet(name: string) {
    if (this.scadParameters.getActiveSetName() === name) {
      this.applyParameterSet(undefined);
    }

    try {
      const content = await workspace.fs.readFile(this.jsonFileUri);
      const data = JSON.parse(Buffer.from(content).toString("utf-8"));
      if (data.parameterSets && data.parameterSets[name]) {
        delete data.parameterSets[name];
        await workspace.fs.writeFile(
          this.jsonFileUri,
          Buffer.from(JSON.stringify(data, null, 2), "utf-8"),
        );
        this.scadParameters.updateParameterSets(data.parameterSets);
      }
    } catch {
      // ignore error if file doesn't exist
    }
  }

  public applyParameterSet(name: string | undefined) {
    this.scadParameters.setActiveSet(name);
    this.requestRender();
  }

  public async exportFormat(format: ModelFormat): Promise<Buffer> {
    return ScadClient.render(
      this.documentUri.fsPath,
      this.scadParameters.getActiveValues(),
      format,
      undefined,
      this._explode,
    );
  }

  public dispose() {
    this.scadWatcher.close();
    this.jsonWatcher?.close();
    this._onRenderStarted.dispose();
    this._onRenderCompleted.dispose();
    this._onRenderError.dispose();
    this._onParametersChanged.dispose();
    this._onAutoRenderChanged.dispose();
    this._onExplodeChanged.dispose();
  }
}
