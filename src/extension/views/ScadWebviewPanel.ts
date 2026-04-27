import {
  Disposable,
  Memento,
  ProgressLocation,
  Uri,
  Webview,
  WebviewPanel,
  env,
  window,
  workspace,
} from "vscode";
import * as os from "os";
import * as path from "path";
import * as cp from "child_process";
import { ExtensionToWebviewMessage } from "../../shared/types/ExtensionToWebviewMessage";
import { ModelFormat } from "../../shared/types/ModelFormat";
import { WebviewToExtensionMessage } from "../../shared/types/WebviewToExtensionMessage";
import { ScadSession } from "../core/ScadSession";

export class ScadWebviewPanel {
  private readonly panel: WebviewPanel;
  private disposables: Disposable[] = [];
  private isWebviewReady: boolean = false;
  private lastRender: { base64Data: string; format: ModelFormat } | undefined;

  private get sceneStateKey(): string {
    return `openscad.scene.${this.session.documentUri.toString()}`;
  }

  constructor(
    panel: WebviewPanel,
    private readonly extensionUri: Uri,
    private readonly session: ScadSession,
    private readonly workspaceState: Memento,
  ) {
    this.panel = panel;

    // Configure webview
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        Uri.joinPath(extensionUri, "dist"),
        Uri.joinPath(extensionUri, "node_modules", "three"),
        Uri.joinPath(extensionUri, "node_modules", "@vscode", "codicons"),
        Uri.joinPath(extensionUri, "src", "webview"),
      ],
    };

    // Set initial HTML content
    this.panel.webview.html = this.getWebviewHtml(
      this.panel.webview,
      extensionUri,
    );

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case "ready":
            this.isWebviewReady = true;
            this.pushInitialState();
            return;
          case "parameterChanged":
            this.session.updateParameterValue(message.name, message.value);
            return;
          case "saveParameterSet":
            this.session.saveParameterSet(message.name);
            return;
          case "promptSaveParameterSet":
            window.showInputBox({
              prompt: "Enter new parameter set name:",
              placeHolder: "Preset Name",
            }).then((name) => {
              if (name && name.trim()) {
                this.session.saveParameterSet(name.trim());
              }
            });
            return;
          case "deleteParameterSet":
            window.showWarningMessage(
              `Are you sure you want to delete the "${message.name}" parameter set?`,
              { modal: true },
              "Delete"
            ).then((selection) => {
              if (selection === "Delete") {
                this.session.deleteParameterSet(message.name);
              }
            });
            return;
          case "applyParameterSet":
            this.session.applyParameterSet(message.name);
            return;
          case "exportModel":
            this.exportModel();
            return;
          case "sendToSlicer":
            this.sendToSlicer();
            return;
          case "persistScene":
            this.workspaceState.update(this.sceneStateKey, message.snapshot);
            return;
          case "error":
            window.showErrorMessage(`Preview Error: ${message.message}`);
            return;
        }
      },
      null,
      this.disposables,
    );

    // Subscribe to session events
    this.session.onRenderStarted(
      () => {
        this.postMessage({
          type: "loadingState",
          loading: true,
          message: "Generating model...",
        });
      },
      null,
      this.disposables,
    );

    this.session.onRenderCompleted(
      ({ buffer, format }) => {
        if (buffer.toString() === "loading") {
          this.postMessage({
            type: "loadingState",
            loading: true,
            message: "Loading model...",
          });
          return;
        }

        const base64Data = buffer.toString("base64");
        this.lastRender = { base64Data, format };
        this.postMessage({
          type: "update",
          content: base64Data,
          format,
        });
      },
      null,
      this.disposables,
    );

    this.session.onParametersChanged(
      ({ parameters, parameterSets, activeSetName, overrides }) => {
        if (this.isWebviewReady) {
          this.postMessage({
            type: "updateParameters",
            parameters,
            parameterSets,
            activeSetName,
            overrides,
          });
        }
      },
      null,
      this.disposables,
    );

    this.session.onLog(
      (message) => {
        if (this.isWebviewReady) {
          this.postMessage({
            type: "log",
            message,
          });
        }
      },
      null,
      this.disposables,
    );

    // Clean up on panel close
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private getWebviewHtml(webview: Webview, extensionUri: Uri): string {
    // Get path to compiled preview script
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(extensionUri, "dist", "webview.js"),
    );

    const codiconUri = webview.asWebviewUri(
      Uri.joinPath(
        extensionUri,
        "node_modules",
        "@vscode",
        "codicons",
        "dist",
        "codicon.css",
      ),
    );

    return /* html */ `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>OpenSCAD Preview</title>
				<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <link rel="stylesheet" href="${codiconUri}" id="vscode-codicon-stylesheet">
				<style>
					body { 
						margin: 0; 
						padding: 0;
						height: 100vh;
						display: flex;
						flex-direction: column;
						overflow: hidden;
						background-color: var(--vscode-editor-background);
						color: var(--vscode-foreground);
						font-family: var(--vscode-font-family);
						font-size: var(--vscode-font-size);
					}
					#root {
						flex: 1;
						display: flex;
						overflow: hidden;
						height: 100%;
					}
				</style>
			</head>
			<body>
				<div id="root"></div>
				<script src="${scriptUri}" type="module"></script>
			</body>
		</html>
	`;
  }

  private pushInitialState() {
    // Send the persisted scene snapshot first so the webview can hydrate
    // before any other state arrives. `null` means "no saved scene" — the
    // webview falls back to its built-in default scene.
    const snapshot = this.workspaceState.get<unknown>(this.sceneStateKey, null);
    this.postMessage({ type: "loadScene", snapshot });

    // Send initial parameters
    const params = this.session.currentParameters;
    const overrides = this.session.currentOverrides;
    const parameterSets = this.session.currentParameterSets;
    const activeSetName = this.session.activeSetName;

    if (params && params.length > 0) {
      this.postMessage({
        type: "updateParameters",
        parameters: params,
        parameterSets,
        activeSetName,
        overrides,
      });
    }

    // Re-send the last completed render so the model is visible immediately,
    // both when the tab first loads (race condition where the render may have
    // completed before the webview was ready) and on tab re-focus (where
    // VSCode destroys and recreates the webview content).
    if (this.lastRender) {
      this.postMessage({
        type: "update",
        content: this.lastRender.base64Data,
        format: this.lastRender.format,
      });
    }
  }

  private async exportModel() {
    const format = await window.showQuickPick(
      [
        {
          value: ModelFormat.ThreeMF,
          label: "3MF",
          description: "Supports colors but requires OpenSCAD Nightly.",
        },
        {
          value: ModelFormat.STL,
          label: "STL",
          description: "Universally supported.",
        },
      ] as const,
      {
        title: "Select Export Format",
      },
    );

    if (!format) {
      return; // User cancelled
    }

    // Attempt to inject Parameter Set Name if active
    // We would need access to the session's activeSetName
    const activeSetName = this.session.activeSetName;
    const appendix = activeSetName ? ` - ${activeSetName}` : "";

    const defaultUri = Uri.file(
      this.session.documentUri.fsPath.replace(/\.scad$/i, `${appendix}.${format.value}`),
    );

    const filters = {
      [format.label]: [format.value],
    };

    const uri = await window.showSaveDialog({
      defaultUri,
      filters,
      title: `Export ${format.label}`,
    });

    if (uri) {
      try {
        // We display a localized progress UI so the user knows an on-demand background render is happening
        await window.withProgress(
          {
            location: ProgressLocation.Notification,
            title: `Rendering ${format.label}...`,
            cancellable: false,
          },
          async () => {
            const buffer = await this.session.exportFormat(format.value);
            await workspace.fs.writeFile(uri, new Uint8Array(buffer));
          },
        );

        window.showInformationMessage(
          `Successfully exported ${format.label} to ${uri.fsPath}`,
        );
      } catch (error) {
        window.showErrorMessage(`Failed to export ${format.label}: ${error}`);
      }
    }
  }

  private async sendToSlicer() {
    try {
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: "Sending to Slicer...",
          cancellable: false,
        },
        async () => {
          const config = workspace.getConfiguration("openscad");
          const formatValue = config.get<string>("previewFormat") || "3mf";
          const format = formatValue === "stl" ? ModelFormat.STL : ModelFormat.ThreeMF;
          
          const buffer = await this.session.exportFormat(format);
          
          const activeSetName = this.session.activeSetName;
          const appendix = activeSetName ? `_${activeSetName.replace(/[^a-z0-9]/gi, '_')}` : "";
          const timestamp = new Date().getTime();
          const tmpFilePath = path.join(
            os.tmpdir(),
            `openscad_preview${appendix}_${timestamp}.${format}`,
          );
          const uri = Uri.file(tmpFilePath);
          
          await workspace.fs.writeFile(uri, new Uint8Array(buffer));
          
          const slicerExecutable = config.get<string>("slicerExecutable");
          
          if (slicerExecutable && slicerExecutable.trim() !== "") {
            cp.execFile(slicerExecutable.trim(), [tmpFilePath], (error) => {
              if (error) {
                window.showErrorMessage(`Failed to launch slicer: ${error.message}`);
              }
            });
          } else {
            await env.openExternal(uri);
          }
        },
      );
    } catch (error) {
      window.showErrorMessage(`Failed to send to slicer: ${error}`);
    }
  }

  private postMessage(message: ExtensionToWebviewMessage) {
    this.panel.webview.postMessage(message);
  }

  public dispose() {
    this.panel.dispose();
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
