import { ExtensionContext } from "vscode";
import { registerShowPanelCommand } from "./commands/showPanel";
import { ScadSessionManager } from "./core/ScadSessionManager";
import { ScadClient } from "./services/ScadClient";

let sessionManager: ScadSessionManager | undefined;

export function activate(context: ExtensionContext) {
  context.subscriptions.push(ScadClient.outputChannel);

  sessionManager = new ScadSessionManager();

  const showPanelDisposable = registerShowPanelCommand(context, sessionManager);
  context.subscriptions.push(showPanelDisposable);
}

export function deactivate() {
  if (sessionManager) {
    sessionManager.dispose();
  }
}
