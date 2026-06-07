import { FSWatcher, watch } from "chokidar";
import { readFile, access } from "fs/promises";

/**
 * Observes one or more files for changes and notifies a callback with the
 * changed file's path and new contents.
 */
export class FileWatcher {
  private watcher: FSWatcher | undefined;
  private onChange: (data: { path: string; content: string }) => void;
  private currentPaths: string[] = [];

  constructor({
    paths,
    onChange,
  }: {
    paths: string | string[];
    onChange: (data: { path: string; content: string }) => void;
  }) {
    this.onChange = onChange;
    this.currentPaths = Array.isArray(paths) ? paths : [paths];
    this.initializeWatcher();
  }

  private async initializeWatcher() {
    if (this.watcher) {
      this.watcher.close();
    }

    // ignoreInitial: true prevents chokidar from firing an "add" event for
    // a file that already exists when the watcher starts. Without this fix,
    // chokidar fires "add" AND we call handleFileChange() explicitly below,
    // so the onChange callback fires twice in rapid succession. The first
    // render gets killed immediately (producing "Render cancelled") and the
    // second runs into a torn-down state (producing "exit code 1").
    this.watcher = watch(this.currentPaths, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on("add", (path) => this.handleFileChange(path));
    this.watcher.on("change", (path) => this.handleFileChange(path));

    // Read the files once immediately so the session has content on startup.
    for (const path of this.currentPaths) {
      await this.handleFileChange(path);
    }
  }

  /**
   * Updates the list of paths being watched.
   */
  public setPaths(paths: string[]) {
    const nextPaths = [...paths];

    // Add new paths
    for (const path of nextPaths) {
      if (!this.currentPaths.includes(path)) {
        this.watcher?.add(path);
      }
    }

    // Remove old paths
    for (const path of this.currentPaths) {
      if (!nextPaths.includes(path)) {
        this.watcher?.unwatch(path);
      }
    }

    this.currentPaths = nextPaths;
  }

  public async triggerManual(path: string) {
    await this.handleFileChange(path);
  }

  private async handleFileChange(path: string) {
    try {
      await access(path);
    } catch {
      return;
    }
    const content = await readFile(path, "utf8");
    this.onChange({ path, content });
  }

  close() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}
