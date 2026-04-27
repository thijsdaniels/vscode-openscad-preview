import { FSWatcher, watch } from "chokidar";
import { readFile, access } from "fs/promises";

/**
 * Observes a file for changes and notifies a callback with the file's new
 * contents when it does.
 */
export class FileWatcher {
  private watcher: FSWatcher | undefined;
  private onChange: (data: { content: string }) => void;

  constructor({
    path,
    onChange,
  }: {
    path: string;
    onChange: (data: { content: string }) => void;
  }) {
    this.onChange = onChange;
    this.watchFile(path);
  }

  public async watchFile(path: string) {
    if (this.watcher) {
      this.watcher.close();
    }

    this.watcher = watch(path, {
      persistent: true,
      ignoreInitial: false,
    });

    this.watcher.on("add", (path) => this.handleFileChange(path));
    this.watcher.on("change", (path) => this.handleFileChange(path));

    await this.handleFileChange(path);
  }

  private async handleFileChange(path: string) {
    try {
      await access(path);
    } catch {
      return;
    }
    const content = await readFile(path, "utf8");
    this.onChange({ content });
  }

  close() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}
