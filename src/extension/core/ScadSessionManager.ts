import { Uri } from "vscode";
import { ScadSession } from "./ScadSession";

/**
 * A centralized manager to track open document sessions. Ensures we only have
 * one parser/watcher running per file, regardless of how many tabs or sidebars
 * are viewing it.
 */
export class ScadSessionManager {
  private sessions = new Map<string, ScadSession>();

  constructor() {}

  /**
   * Gets an existing session for a URI or creates a new one if it doesn't
   * exist.
   */
  public getOrCreateSession(documentUri: Uri): ScadSession {
    const key = documentUri.toString();
    let session = this.sessions.get(key);

    if (!session) {
      session = new ScadSession(documentUri);
      this.sessions.set(key, session);
    }

    return session;
  }

  /**
   * Disposes a completely closed session.
   */
  public removeSession(documentUri: Uri) {
    const key = documentUri.toString();
    const session = this.sessions.get(key);
    if (session) {
      session.dispose();
      this.sessions.delete(key);
    }
  }

  public dispose() {
    for (const session of this.sessions.values()) {
      session.dispose();
    }
    this.sessions.clear();
  }
}
