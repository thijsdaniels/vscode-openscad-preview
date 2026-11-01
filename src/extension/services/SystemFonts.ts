import { execFile } from "child_process";
import { platform } from "process";

/** Command printing one installed font family per line, per platform. */
const LIST_COMMANDS: Record<string, [string, string[]]> = {
  win32: [
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Add-Type -AssemblyName System.Drawing; (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object Name",
    ],
  ],
  darwin: ["fc-list", ["--format", "%{family[0]}\\n"]],
  linux: ["fc-list", ["--format", "%{family[0]}\\n"]],
};

let cache: Promise<string[]> | undefined;

/** Installed font families, sorted; empty when they cannot be listed. */
export function listSystemFonts(): Promise<string[]> {
  cache ??= new Promise((resolve) => {
    const command = LIST_COMMANDS[platform];
    if (!command) return resolve([]);
    execFile(command[0], command[1], { windowsHide: true }, (error, stdout) => {
      if (error) return resolve([]);
      const families = new Set(
        stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
      );
      resolve([...families].sort((a, b) => a.localeCompare(b)));
    });
  });
  // A failed listing is retried next time.
  return cache.then((fonts) => {
    if (!fonts.length) cache = undefined;
    return fonts;
  });
}
