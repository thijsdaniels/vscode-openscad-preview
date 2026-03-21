import { ReactiveController, ReactiveControllerHost } from "lit";
import { ContextProvider } from "@lit/context";
import { logContext, LogMessage } from "../contexts/LogContext";

export class LogController implements ReactiveController {
  private host: ReactiveControllerHost;
  private provider: ContextProvider<typeof logContext>;

  private logs: LogMessage[] = [];
  private autoClear: boolean = true;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    // We attach the ContextProvider to the host. Any component beneath the host
    // in the DOM that @consumes logContext will automatically find this provider!
    this.provider = new ContextProvider(host as unknown as HTMLElement, {
      context: logContext,
    });
    host.addController(this);
    this.updateProvider();
  }

  hostConnected() {}
  hostDisconnected() {}

  private updateProvider() {
    this.provider.setValue({
      logs: this.logs,
      autoClear: this.autoClear,
      clear: () => this.clear(),
      toggleAutoClear: () => this.toggleAutoClear(),
    });
    // Request a UI update on the host component when the context changes
    this.host.requestUpdate();
  }

  public clear() {
    this.logs = [];
    this.updateProvider();
  }

  public toggleAutoClear() {
    this.autoClear = !this.autoClear;
    this.updateProvider();
  }

  /**
   * Called by the host when a new loading state message comes in
   */
  public processLoadingState(loading: boolean) {
    if (loading && this.autoClear) {
      this.clear();
    }
  }

  /**
   * Called by the host when a raw chunk of stderr comes in from the CLI
   */
  public processLogChunk(chunk: string) {
    if (!chunk) return;

    const lines = chunk.split("\n").filter((l) => l.trim().length > 0);
    const newLogs = [...this.logs];

    for (const line of lines) {
      const trimmed = line.trim();

      // If it's a TRACE, attach it to the preceding Error or Warning
      if (trimmed.startsWith("TRACE:")) {
        const traceText = trimmed.replace(/^TRACE:\s*/i, "");
        const lastLog = newLogs[newLogs.length - 1];
        if (
          lastLog &&
          (lastLog.level === "error" || lastLog.level === "warning")
        ) {
          lastLog.traces.push(traceText);
        } else {
          // If we somehow get an orphaned TRACE, treat as general info
          newLogs.push({
            id: crypto.randomUUID(),
            level: "info",
            text: line,
            traces: [],
          });
        }
      } else if (trimmed.startsWith("WARNING:")) {
        newLogs.push({
          id: crypto.randomUUID(),
          level: "warning",
          text: trimmed.replace(/^WARNING:\s*/i, ""),
          traces: [],
        });
      } else if (
        trimmed.startsWith("ERROR:") ||
        trimmed.startsWith("Parse error")
      ) {
        newLogs.push({
          id: crypto.randomUUID(),
          level: "error",
          text: trimmed.replace(/^(?:ERROR|Parse error):\s*/i, ""),
          traces: [],
        });
      } else {
        newLogs.push({
          id: crypto.randomUUID(),
          level: "info",
          text: line,
          traces: [],
        });
      }
    }

    // Cap at 1000 lines to prevent runaway memory leaks
    this.logs = newLogs.slice(-1000);
    this.updateProvider();
  }
}
