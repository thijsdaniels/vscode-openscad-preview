import {
  Disposable,
  ProgressLocation,
  Uri,
  Webview,
  WebviewPanel,
  window,
  workspace,
} from "vscode";
import { ExtensionToWebviewMessage } from "../../shared/types/ExtensionToWebviewMessage";
import { ModelFormat } from "../../shared/types/ModelFormat";
import { WebviewToExtensionMessage } from "../../shared/types/WebviewToExtensionMessage";
import { ScadSession } from "../core/ScadSession";

export class ScadWebviewPanel {
  private readonly panel: WebviewPanel;
  private disposables: Disposable[] = [];
  private isWebviewReady: boolean = false;

  constructor(
    panel: WebviewPanel,
    private readonly extensionUri: Uri,
    private readonly session: ScadSession,
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
          case "exportModel":
            this.exportModel();
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
      ({ parameters, overrides }) => {
        if (this.isWebviewReady) {
          this.postMessage({
            type: "updateParameters",
            parameters,
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
    // Send initial parameters
    const params = this.session.currentParameters;
    const overrides = this.session.currentOverrides;
    if (params && params.length > 0) {
      this.postMessage({
        type: "updateParameters",
        parameters: params,
        overrides,
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

    const defaultUri = Uri.file(
      this.session.documentUri.fsPath.replace(/\.scad$/i, `.${format.value}`),
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
