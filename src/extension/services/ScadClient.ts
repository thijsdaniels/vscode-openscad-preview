import { ChildProcessWithoutNullStreams, execFile, spawn } from "child_process";
import { existsSync } from "fs";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { platform } from "process";
import { l10n, window, workspace } from "vscode";
import { ModelFormat } from "../../shared/types/ModelFormat";

type RenderBackend = "auto" | "manifold" | "cgal";

const platformDefaults: Record<string, string[]> = {
  darwin: ["/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD"],
  // Nightly first: it ships the fast Manifold engine, the 2021 release does not.
  win32: [
    "C:\\Program Files\\OpenSCAD (Nightly)\\openscad.exe",
    "C:\\Program Files (x86)\\OpenSCAD (Nightly)\\openscad.exe",
    "C:\\Program Files\\OpenSCAD\\openscad.exe",
    "C:\\Program Files (x86)\\OpenSCAD\\openscad.exe",
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

  public static readonly outputChannel =
    window.createOutputChannel("OpenSCAD Preview");

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

  // Probe result per executable: does it accept `--backend` (OpenSCAD ≥ 2024)?
  private static backendSupport = new Map<string, Promise<boolean>>();

  private static supportsBackend(execPath: string): Promise<boolean> {
    let probe = this.backendSupport.get(execPath);
    if (!probe) {
      probe = new Promise((resolve) => {
        // `--help` prints to stderr on some versions: scan both streams.
        execFile(execPath, ["--help"], (_error, stdout, stderr) => {
          const supported = `${stdout}${stderr}`.includes("--backend");
          if (!supported) {
            this.outputChannel.appendLine(
              "[OpenSCAD] No --backend support (OpenSCAD < 2024): slow CGAL rendering. Install a recent OpenSCAD (nightly) to use Manifold.",
            );
          }
          resolve(supported);
        });
      });
      this.backendSupport.set(execPath, probe);
    }
    return probe;
  }

  private static async backendArgs(execPath: string): Promise<string[]> {
    const setting = workspace
      .getConfiguration("openscad")
      .get<RenderBackend>("renderBackend", "auto");

    if (setting === "auto") {
      return (await this.supportsBackend(execPath))
        ? ["--backend", "manifold"]
        : [];
    }

    return ["--backend", setting];
  }

  public static async render(
    scadPath: string,
    parameters: Record<string, string | number | boolean> = {},
    format: ModelFormat = ModelFormat.ThreeMF,
    onStderr?: (chunk: string) => void,
    // Lazy union: each top-level object becomes its own part in the export.
    explode = false,
  ): Promise<Buffer> {
    // Kill any currently running process for this file to prevent runaway
    // spawn leaks when sliders emit rapid updates.
    const existingProcess = this.activeProcesses.get(scadPath);
    if (existingProcess) {
      existingProcess.kill();
      this.activeProcesses.delete(scadPath);
    }

    const execPath = ScadClient.executablePath;
    const backend = await this.backendArgs(execPath);

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

      const args = [
        "--export-format",
        format,
        ...backend,
        ...(explode ? ["--enable", "lazy-union"] : []),
        "-o",
        tmpFile,
        ...paramArgs,
        scadPath,
      ];

      this.outputChannel.appendLine(
        `[OpenSCAD] Running: ${execPath} ${args.join(" ")}`,
      );

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
        if (
          signal === "SIGTERM" ||
          (platform === "win32" &&
            signal === null &&
            code === 1 &&
            stderrBuffer === "")
        ) {
          reject(new Error("Render cancelled"));
          return;
        }

        if (code !== 0) {
          const detail = stderrBuffer.trim() ? `\n${stderrBuffer.trim()}` : "";
          this.outputChannel.appendLine(
            `[OpenSCAD] Process exited with code ${code}${detail ? "" : " (no stderr output)"}`,
          );
          reject(
            new Error(
              l10n.t("OpenSCAD process exited with code {0}", String(code)) +
                detail,
            ),
          );
          return;
        }

        try {
          const buffer = await readFile(tmpFile);
          this.outputChannel.appendLine(
            `[OpenSCAD] Render complete: ${tmpFile}`,
          );
          resolve(buffer);
        } catch (err) {
          reject(
            new Error(
              l10n.t("Failed to read temporary output file: {0}", String(err)),
            ),
          );
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
        const msg = l10n.t(
          "Failed to start OpenSCAD: {0}\nExecutable path: {1}",
          err.message,
          execPath,
        );
        this.outputChannel.appendLine(`[OpenSCAD] ${msg}`);
        reject(new Error(msg));
      });
    });
  }
}
