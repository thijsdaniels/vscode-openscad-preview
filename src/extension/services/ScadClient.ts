import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { ModelFormat } from "../../shared/types/ModelFormat";

/**
 * A TypeScript wrapper around the OpenSCAD CLI. This is currently very limited
 * in functionality, serving only the needs of this extension.
 */
export class ScadClient {
  private static activeProcesses = new Map<
    string,
    ChildProcessWithoutNullStreams
  >();

  public static async render(
    scadPath: string,
    parameters: Record<string, string | number | boolean> = {},
    format: ModelFormat = ModelFormat.ThreeMF,
    onStderr?: (chunk: string) => void,
  ): Promise<Buffer> {
    // Kill any currently running process for this file to prevent runway spawn leaks
    // when sliders emit rapid updates
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
        paramArgs.push("-D", `${name}=${value}`);
      }

      const process = spawn("openscad", [
        "--export-format",
        format,
        "-o",
        tmpFile,
        ...paramArgs,
        scadPath,
      ]);

      this.activeProcesses.set(scadPath, process);

      process.stderr.on("data", (data) => {
        if (onStderr) {
          onStderr(data.toString());
        }
      });

      process.on("close", async (code, signal) => {
        this.activeProcesses.delete(scadPath);

        // If process was killed gracefully by our cancellation, cleanly reject error
        if (signal === "SIGTERM") {
          reject(new Error("Render cancelled"));
          return;
        }

        if (code !== 0) {
          const errorMsg = `OpenSCAD process exited with code ${code}`;
          reject(new Error(errorMsg));
          return;
        }

        try {
          const buffer = await readFile(tmpFile);
          resolve(buffer);
        } catch (err) {
          reject(new Error(`Failed to read temporary 3MF file: ${err}`));
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
        this.activeProcesses.delete(scadPath);
        const errorMsg = `Failed to start OpenSCAD: ${err}`;
        reject(new Error(errorMsg));
      });
    });
  }
}
