import { EventEmitter, Uri } from "vscode";
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
    overrides: Record<string, string | number | boolean>;
  }>();
  public readonly onParametersChanged = this._onParametersChanged.event;

  private _onRenderStarted = new EventEmitter<void>();
  public readonly onRenderStarted = this._onRenderStarted.event;

  private _onLog = new EventEmitter<string>();
  public readonly onLog = this._onLog.event;

  /**
   * @todo The session lifecycle isn't as clean as it could be. For example,
   * it shouldn't be necessary to fire the onParametersUpdated event from the
   * scadWatcher.onChange callback, because that callback is already updating
   * the parameters, which _should_ trigger the scadParameters.onChange
   * callback, but it currently doesn't. When it does, we should make sure we
   * don't render twice, because the scadParameters.onChange callback already
   * triggers a render as well. Perhaps the lifecycle itself is OK, but just not
   * very clearly laid out.
   */
  constructor(public readonly documentUri: Uri) {
    this.scadRenderer = new ScadRenderer({
      onStart: () => this._onRenderStarted.fire(),
      onComplete: (data) => this._onRenderCompleted.fire(data),
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
  }

  public get currentParameters(): ScadParameter[] {
    return this.scadParameters.getParameters();
  }

  public get currentOverrides(): Record<string, string | number | boolean> {
    return this.scadParameters.getOverrides();
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

  public async exportFormat(format: ModelFormat): Promise<Buffer> {
    return ScadClient.render(
      this.documentUri.fsPath,
      this.scadParameters.getActiveValues(),
      format,
    );
  }

  public dispose() {
    this.scadWatcher.close();
    this._onRenderStarted.dispose();
    this._onRenderCompleted.dispose();
    this._onParametersChanged.dispose();
  }
}
