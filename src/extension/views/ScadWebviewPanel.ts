import {
  Disposable,
  Memento,
  ProgressLocation,
  Uri,
  Webview,
  WebviewPanel,
  commands,
  env,
  extensions,
  l10n,
  window,
  workspace,
} from "vscode";
import * as os from "os";
import * as path from "path";
import * as cp from "child_process";
import { ExtensionToWebviewMessage } from "../../shared/types/ExtensionToWebviewMessage";
import { ModelFormat } from "../../shared/types/ModelFormat";
import { ParameterLabelMode } from "../../shared/types/ParameterLabelMode";
import { WebviewToExtensionMessage } from "../../shared/types/WebviewToExtensionMessage";
import { ScadSession } from "../core/ScadSession";
import { PARAMETER_PICKERS } from "../services/ParameterPickers";

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
          case "pickParameterValue":
            this.pickParameterValue(message.name);
            return;
          case "saveParameterSet":
            this.session.saveParameterSet(message.name);
            return;
          case "promptSaveParameterSet":
            window
              .showInputBox({
                prompt: l10n.t("Enter new parameter set name:"),
                placeHolder: l10n.t("Preset Name"),
              })
              .then((name) => {
                if (name && name.trim()) {
                  this.session.saveParameterSet(name.trim());
                }
              });
            return;
          case "deleteParameterSet": {
            const deleteLabel = l10n.t("Delete");
            window
              .showWarningMessage(
                l10n.t(
                  'Are you sure you want to delete the "{0}" parameter set?',
                  message.name,
                ),
                { modal: true },
                deleteLabel,
              )
              .then((selection) => {
                if (selection === deleteLabel) {
                  this.session.deleteParameterSet(message.name);
                }
              });
            return;
          }
          case "applyParameterSet":
            this.session.applyParameterSet(message.name);
            return;
          case "exportModel":
            this.exportModel();
            return;
          case "sendToSlicer":
            this.sendToSlicer();
            return;
          case "setAutoRender":
            this.session.setAutoRender(message.enabled);
            return;
          case "renderNow":
            this.session.renderNow();
            return;
          case "setExplode":
            this.session.setExplode(message.enabled);
            return;
          case "openSettings":
            // Settings editor filtered on this extension's own settings.
            commands.executeCommand(
              "workbench.action.openSettings",
              `@ext:${
                extensions.all.find(
                  (ext) =>
                    ext.extensionUri.toString() ===
                    this.extensionUri.toString(),
                )?.id ?? ""
              }`,
            );
            return;
          case "setParameterLabel":
            // Stored globally; the configuration listener echoes it back.
            workspace
              .getConfiguration("openscad")
              .update("parameterLabel", message.mode, true);
            return;
          case "persistScene":
            this.workspaceState.update(this.sceneStateKey, message.snapshot);
            return;
          case "error":
            window.showErrorMessage(
              l10n.t("Preview Error: {0}", message.message),
            );
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
          message: l10n.t("Generating model..."),
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
            message: l10n.t("Loading model..."),
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

    this.session.onRenderError(
      (err) => {
        // Clear the loading spinner so the webview doesn't hang indefinitely.
        this.postMessage({
          type: "loadingState",
          loading: false,
        });

        // Show the error in the VS Code notification area and direct the user
        // to the output channel for the full OpenSCAD stderr output.
        const msg = err.message;
        const showOutputLabel = l10n.t("Show Output");
        window
          .showErrorMessage(
            l10n.t("OpenSCAD render failed: {0}", msg.split("\n")[0]),
            showOutputLabel,
          )
          .then((choice) => {
            if (choice === showOutputLabel) {
              // The output channel is named "OpenSCAD Preview" — reveal it.
              // We can't reference it directly here, but the user can open it
              // from View > Output and select "OpenSCAD Preview".
              window.showInformationMessage(
                l10n.t(
                  'Open the Output panel and select "OpenSCAD Preview" from the dropdown to see the full error.',
                ),
              );
            }
          });

        // Also forward the first line of the error to the webview log panel.
        if (this.isWebviewReady) {
          this.postMessage({
            type: "log",
            message: `ERROR: ${msg}`,
          });
        }
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

    workspace.onDidChangeConfiguration(
      (event) => {
        if (
          this.isWebviewReady &&
          event.affectsConfiguration("openscad.parameterLabel")
        ) {
          this.postParameterLabel();
        }
        if (
          this.isWebviewReady &&
          event.affectsConfiguration("openscad.defaultColor")
        ) {
          this.postDefaultColor();
        }
      },
      null,
      this.disposables,
    );

    this.session.onAutoRenderChanged(
      ({ enabled, pending }) => {
        if (this.isWebviewReady) {
          this.postMessage({ type: "autoRender", enabled, pending });
        }
      },
      null,
      this.disposables,
    );

    this.session.onExplodeChanged(
      (enabled) => {
        if (this.isWebviewReady) {
          this.postMessage({ type: "explode", enabled });
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

    // `lang` carries VS Code's display language to the webview translations.
    return /* html */ `
		<!DOCTYPE html>
		<html lang="${env.language}">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>${l10n.t("OpenSCAD Preview")}</title>
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

  private postParameterLabel() {
    const mode = workspace
      .getConfiguration("openscad")
      .get<ParameterLabelMode>("parameterLabel", "name");
    this.postMessage({ type: "parameterLabel", mode });
  }

  private async pickParameterValue(name: string) {
    const param = this.session.currentParameters.find((p) => p.name === name);
    if (param?.type !== "string" || !param.editor) return;
    const picker = PARAMETER_PICKERS[param.editor];
    if (!picker) return;

    const current = String(this.session.currentOverrides[name] ?? param.value);
    const value = await picker(
      param,
      current,
      path.dirname(this.session.documentUri.fsPath),
    );
    // The override echoes back to the webview through onParametersChanged.
    if (value !== undefined) this.session.updateParameterValue(name, value);
  }

  private postDefaultColor() {
    const color = workspace
      .getConfiguration("openscad")
      .get<string>("defaultColor", "");
    this.postMessage({ type: "defaultColor", color });
  }

  private pushInitialState() {
    // Send the persisted scene snapshot first so the webview can hydrate
    // before any other state arrives. `null` means "no saved scene" — the
    // webview falls back to its built-in default scene.
    const snapshot = this.workspaceState.get<unknown>(this.sceneStateKey, null);
    this.postMessage({ type: "loadScene", snapshot });

    // The webview is recreated on tab re-focus: restore the toggle state.
    this.postMessage({ type: "autoRender", ...this.session.autoRender });
    this.postMessage({ type: "explode", enabled: this.session.explode });
    this.postParameterLabel();
    this.postDefaultColor();

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
          description: l10n.t("Supports colors but requires OpenSCAD Nightly."),
        },
        {
          value: ModelFormat.STL,
          label: "STL",
          description: l10n.t("Universally supported."),
        },
      ] as const,
      {
        title: l10n.t("Select Export Format"),
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
      this.session.documentUri.fsPath.replace(
        /\.scad$/i,
        `${appendix}.${format.value}`,
      ),
    );

    const filters = {
      [format.label]: [format.value],
    };

    const uri = await window.showSaveDialog({
      defaultUri,
      filters,
      title: l10n.t("Export {0}", format.label),
    });

    if (uri) {
      try {
        // We display a localized progress UI so the user knows an on-demand background render is happening
        await window.withProgress(
          {
            location: ProgressLocation.Notification,
            title: l10n.t("Rendering {0}...", format.label),
            cancellable: false,
          },
          async () => {
            const buffer = await this.session.exportFormat(format.value);
            await workspace.fs.writeFile(uri, new Uint8Array(buffer));
          },
        );

        window.showInformationMessage(
          l10n.t("Successfully exported {0} to {1}", format.label, uri.fsPath),
        );
      } catch (error) {
        window.showErrorMessage(
          l10n.t("Failed to export {0}: {1}", format.label, String(error)),
        );
      }
    }
  }

  private async sendToSlicer() {
    try {
      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: l10n.t("Sending to Slicer..."),
          cancellable: false,
        },
        async () => {
          const config = workspace.getConfiguration("openscad");
          const formatValue = config.get<string>("previewFormat") || "3mf";
          const format =
            formatValue === "stl" ? ModelFormat.STL : ModelFormat.ThreeMF;

          const buffer = await this.session.exportFormat(format);

          const activeSetName = this.session.activeSetName;
          const appendix = activeSetName
            ? `_${activeSetName.replace(/[^a-z0-9]/gi, "_")}`
            : "";
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
                window.showErrorMessage(
                  l10n.t("Failed to launch slicer: {0}", error.message),
                );
              }
            });
          } else {
            await env.openExternal(uri);
          }
        },
      );
    } catch (error) {
      window.showErrorMessage(
        l10n.t("Failed to send to slicer: {0}", String(error)),
      );
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
