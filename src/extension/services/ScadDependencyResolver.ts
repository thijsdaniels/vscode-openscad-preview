import { existsSync } from "fs";
import { readFile } from "fs/promises";
import * as path from "path";
import { ScadParameter } from "../../shared/types/ScadParameter";
import { ScadParser } from "./ScadParser";

export interface DependencyGraph {
  allParameters: ScadParameter[];
  discoveredFiles: string[];
}

export class ScadDependencyResolver {
  private discoveredFiles = new Set<string>();
  private parametersProcessed = new Set<string>();
  private allParameters: ScadParameter[] = [];

  constructor(
    private readonly options: {
      onLog?: (message: string) => void;
      readFile?: (path: string) => Promise<string>;
      existsSync?: (path: string) => boolean;
    } = {},
  ) {}

  private async doReadFile(filePath: string): Promise<string> {
    if (this.options.readFile) {
      return this.options.readFile(filePath);
    }
    return readFile(filePath, "utf8");
  }

  private doExistsSync(filePath: string): boolean {
    if (this.options.existsSync) {
      return this.options.existsSync(filePath);
    }
    return existsSync(filePath);
  }

  public async resolve(mainFilePath: string): Promise<DependencyGraph> {
    this.discoveredFiles.clear();
    this.parametersProcessed.clear();
    this.allParameters = [];

    await this.parseRecursive(mainFilePath, true);

    return {
      allParameters: this.allParameters,
      discoveredFiles: Array.from(this.discoveredFiles),
    };
  }

  private async parseRecursive(filePath: string, collectParameters: boolean) {
    if (this.parametersProcessed.has(filePath)) return;
    if (this.discoveredFiles.has(filePath) && !collectParameters) return;

    this.discoveredFiles.add(filePath);
    if (collectParameters) {
      this.parametersProcessed.add(filePath);
    }

    try {
      const content = await this.doReadFile(filePath);
      const parser = new ScadParser(content);

      // Process includes (recurse and collect parameters)
      for (const includePath of parser.includes) {
        const resolved = this.resolveInclude(filePath, includePath);
        if (resolved) {
          await this.parseRecursive(resolved, collectParameters);
        } else {
          this.options.onLog?.(`Warning: Could not resolve include <${includePath}> from ${filePath}\n`);
        }
      }

      // Process uses (recurse but don't collect parameters)
      for (const usePath of parser.uses) {
        const resolved = this.resolveInclude(filePath, usePath);
        if (resolved) {
          await this.parseRecursive(resolved, false);
        } else {
          this.options.onLog?.(`Warning: Could not resolve use <${usePath}> from ${filePath}\n`);
        }
      }

      if (collectParameters) {
        this.allParameters.push(...parser.parameters);
      }
    } catch (err) {
      this.options.onLog?.(`Error reading file ${filePath}: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  private resolveInclude(basePath: string, includePath: string): string | undefined {
    const dir = path.dirname(basePath);
    const resolved = path.resolve(dir, includePath);
    if (this.doExistsSync(resolved)) {
      return resolved;
    }
    return undefined;
  }
}
