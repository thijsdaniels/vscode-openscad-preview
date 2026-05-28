import { EventEmitter, Uri, workspace } from "vscode";
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

  constructor(public readonly documentUri: Uri) {
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

        this.scadRenderer.render(
          this.documentUri.fsPath,
          this.scadParameters.getActiveValues(),
        );
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

            const oldValues = JSON.stringify(this.scadParameters.getActiveValues());
            const activeSetName = this.scadParameters.getActiveSetName();
            if (activeSetName) {
              if (!(activeSetName in data.parameterSets)) {
                this.applyParameterSet(undefined);
              } else {
                // Hot-reload the active set to ingest external JSON changes into the flat overrides bucket
                this.scadParameters.setActiveSet(activeSetName);
                
                if (JSON.stringify(this.scadParameters.getActiveValues()) !== oldValues) {
                  this.scadRenderer.render(
                    this.documentUri.fsPath,
                    this.scadParameters.getActiveValues(),
                  );
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

    this.scadRenderer.render(
      this.documentUri.fsPath,
      this.scadParameters.getActiveValues(),
    );
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

    await workspace.fs.writeFile(this.jsonFileUri, Buffer.from(JSON.stringify(data, null, 2), "utf-8"));
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
        await workspace.fs.writeFile(this.jsonFileUri, Buffer.from(JSON.stringify(data, null, 2), "utf-8"));
        this.scadParameters.updateParameterSets(data.parameterSets);
      }
    } catch {
      // ignore error if file doesn't exist
    }
  }

  public applyParameterSet(name: string | undefined) {
    this.scadParameters.setActiveSet(name);
    this.scadRenderer.render(
      this.documentUri.fsPath,
      this.scadParameters.getActiveValues(),
    );
  }

  public async exportFormat(format: ModelFormat): Promise<Buffer> {
    return ScadClient.render(
      this.documentUri.fsPath,
      this.scadParameters.getActiveValues(),
      format,
    );
  }

  public dispose() {
    this.scadWatcher.close();
    this.jsonWatcher?.close();
    this._onRenderStarted.dispose();
    this._onRenderCompleted.dispose();
    this._onRenderError.dispose();
    this._onParametersChanged.dispose();
  }
}
