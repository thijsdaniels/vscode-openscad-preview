import {
  commands,
  Disposable,
  ExtensionContext,
  Uri,
  ViewColumn,
  window,
} from "vscode";
import { ScadSessionManager } from "../core/ScadSessionManager";
import { ScadWebviewPanel } from "../views/ScadWebviewPanel";

// Keep track of active panels by URI to avoid opening duplicates
const activePanels = new Map<string, ScadWebviewPanel>();

export function registerShowPanelCommand(
  context: ExtensionContext,
  sessionManager: ScadSessionManager,
): Disposable {
  return commands.registerCommand("openscad.showPanel", () => {
    const editor = window.activeTextEditor;

    if (!editor) {
      return;
    }

    const documentUri = editor.document.uri;
    const key = documentUri.toString();

    // If a panel is already open for this file, just reveal it
    if (activePanels.has(key)) {
      // There's currently no public API on ScadPreviewPanel to reveal,
      // but we can add one later if needed. For now, we just skip creating a duplicate.
      window.showInformationMessage("Preview is already open for this file.");
      return;
    }

    // Retrieve or create the long-lived session for this document
    const session = sessionManager.getOrCreateSession(documentUri);

    // Create the Webview tab
    const webviewPanel = window.createWebviewPanel(
      "openscadPreview",
      `OpenSCAD Preview: ${documentUri.path.split("/").pop()}`,
      ViewColumn.Beside,
      {
        enableScripts: true,
        enableFindWidget: true,
        localResourceRoots: [
          Uri.joinPath(context.extensionUri, "dist"),
          Uri.joinPath(context.extensionUri, "node_modules", "three"),
        ],
      },
    );

    // Instantiate our controller wrapper
    const scadPreviewPanel = new ScadWebviewPanel(
      webviewPanel,
      context.extensionUri,
      session,
      context.workspaceState,
    );

    activePanels.set(key, scadPreviewPanel);

    // When the user closes the Webview, clean up our map and tell the session manager
    webviewPanel.onDidDispose(() => {
      activePanels.delete(key);
      sessionManager.removeSession(documentUri);
    });
  });
}
