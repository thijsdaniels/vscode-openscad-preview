import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { existsSync } from "fs";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { platform } from "process";
import { window, workspace } from "vscode";
import { ModelFormat } from "../../shared/types/ModelFormat";

const platformDefaults: Record<string, string[]> = {
  darwin: ["/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD"],
  win32: [
    "C:\\Program Files\\OpenSCAD\\openscad.exe",
    "C:\\Program Files (x86)\\OpenSCAD\\openscad.exe",
    "C:\\Program Files\\OpenSCAD (Nightly)\\openscad.exe",
    "C:\\Program Files (x86)\\OpenSCAD (Nightly)\\openscad.exe",
  ],
  linux: ["/usr/bin/openscad", "/usr/local/bin/openscad"],
};

/**
 * A TypeScript wrapper around the OpenSCAD CLI. This is currently very limited
 * in functionality, serving only the needs of this extension.
 */
export class ScadClient {
  private static activeProcesses = new Map<
    string,
    ChildProcessWithoutNullStreams
  >();

  public static readonly outputChannel = window.createOutputChannel("OpenSCAD Preview");

  private static _executablePath: string | undefined;

  private static get executablePath(): string {
    if (this._executablePath) {
      return this._executablePath;
    }

    const setting = workspace
      .getConfiguration("openscad")
      .get<string>("executablePath", "");

    if (setting) {
      return setting;
    }

    const defaults = platformDefaults[platform] ?? [];
    const detected = defaults.find((path) => existsSync(path));

    if (detected) {
      return detected;
    }

    return "openscad";
  }

  private static get enableLazyUnion(): string[] {
    const setting = workspace
      .getConfiguration("openscad")
      .get<boolean>("enableLazyUnion", false);

    return setting ? ["--enable", "lazy-union"] : [];
  }

  private static extraArgsFor(preview: boolean): string[] {
    const config = workspace.getConfiguration("openscad");
    const common = config.get<string[]>("extraArgs", []);
    const modeSpecific = config.get<string[]>(
      preview ? "extraArgsPreview" : "extraArgsExport",
      [],
    );
    return [...common, ...modeSpecific];
  }

  public static async render(
    scadPath: string,
    parameters: Record<string, string | number | boolean> = {},
    format: ModelFormat = ModelFormat.ThreeMF,
    { preview = false, onStderr }: { preview?: boolean; onStderr?: (chunk: string) => void } = {},
  ): Promise<Buffer> {
    // Kill any currently running process for this file to prevent runaway
    // spawn leaks when sliders emit rapid updates.
    const existingProcess = this.activeProcesses.get(scadPath);
    if (existingProcess) {
      existingProcess.kill();
      this.activeProcesses.delete(scadPath);
    }

    return new Promise((resolve, reject) => {
      const tmpFile = join(
        tmpdir(),
        `openscad-render-${crypto.randomUUID()}.${format}`,
      );

      const paramArgs: string[] = [];
      for (const [name, value] of Object.entries(parameters)) {
        if (typeof value === "string") {
          paramArgs.push("-D", `${name}="${value}"`);
          continue;
        }

        paramArgs.push("-D", `${name}=${value}`);
      }

      const execPath = ScadClient.executablePath;
      const args = [
        "--export-format",
        format,
        ...this.enableLazyUnion,
        "-o",
        tmpFile,
        // OpenSCAD's canPreview() excludes geometry formats (3mf, stl, etc.) so
        // --preview does not set $preview for these formats — must be set explicitly.
        ...(preview ? ["-D", "$preview=true"] : []),
        ...paramArgs,
        ...ScadClient.extraArgsFor(preview),
        scadPath,
      ];

      this.outputChannel.appendLine(`[OpenSCAD] Running: ${execPath} ${args.join(" ")}`);

      const process = spawn(execPath, args);

      this.activeProcesses.set(scadPath, process);

      let stderrBuffer = "";

      process.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderrBuffer += chunk;
        // Always log to the output channel so the user can see OpenSCAD errors
        // regardless of whether the webview is ready.
        this.outputChannel.append(chunk);
        if (onStderr) {
          onStderr(chunk);
        }
      });

      process.on("close", async (code, signal) => {
        // Only clean up the map entry if it still points to this process.
        // A newer render may have already replaced it; blindly deleting would
        // remove the active process and break subsequent cancellation.
        if (this.activeProcesses.get(scadPath) === process) {
          this.activeProcesses.delete(scadPath);
        }

        // If process was killed gracefully by our cancellation, reject cleanly.
        if (signal === "SIGTERM" || (platform === "win32" && signal === null && code === 1 && stderrBuffer === "")) {
          reject(new Error("Render cancelled"));
          return;
        }

        if (code !== 0) {
          const detail = stderrBuffer.trim() ? `\n${stderrBuffer.trim()}` : "";
          this.outputChannel.appendLine(`[OpenSCAD] Process exited with code ${code}${detail ? "" : " (no stderr output)"}`);
          reject(new Error(`OpenSCAD process exited with code ${code}${detail}`));
          return;
        }

        try {
          const buffer = await readFile(tmpFile);
          this.outputChannel.appendLine(`[OpenSCAD] Render complete: ${tmpFile}`);
          resolve(buffer);
        } catch (err) {
          reject(new Error(`Failed to read temporary output file: ${err}`));
        } finally {
          // Clean up the temp file
          try {
            await unlink(tmpFile);
          } catch {
            // Ignore cleanup failure
          }
        }
      });

      process.on("error", (err) => {
        if (this.activeProcesses.get(scadPath) === process) {
          this.activeProcesses.delete(scadPath);
        }
        const msg = `Failed to start OpenSCAD: ${err.message}\nExecutable path: ${execPath}`;
        this.outputChannel.appendLine(`[OpenSCAD] ${msg}`);
        reject(new Error(msg));
      });
    });
  }
}
