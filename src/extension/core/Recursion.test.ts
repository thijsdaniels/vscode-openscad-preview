import test from "node:test";
import assert from "node:assert";

/**
 * Mocking the core of the recursive discovery logic to verify circular dependency handling.
 */
class DependencyGraph {
  public discoveredFiles = new Set<string>();
  public parametersProcessed = new Set<string>();
  public logs: string[] = [];

  constructor(private files: Record<string, { includes: string[], uses: string[] }>) {}

  async parseRecursive(filePath: string, collectParameters: boolean) {
    if (this.parametersProcessed.has(filePath)) return;
    if (this.discoveredFiles.has(filePath) && !collectParameters) return;

    this.discoveredFiles.add(filePath);
    if (collectParameters) {
      this.parametersProcessed.add(filePath);
    }

    const file = this.files[filePath];
    if (!file) {
      this.logs.push(`Error reading file ${filePath}`);
      return;
    }

    for (const inc of file.includes) {
      await this.parseRecursive(inc, collectParameters);
    }
    for (const use of file.uses) {
      await this.parseRecursive(use, false);
    }
  }
}

test("Circular dependency - include cycle", async () => {
  const files = {
    "A.scad": { includes: ["B.scad"], uses: [] },
    "B.scad": { includes: ["A.scad"], uses: [] },
  };

  const graph = new DependencyGraph(files);
  await graph.parseRecursive("A.scad", true);

  assert.strictEqual(graph.discoveredFiles.size, 2);
  assert.ok(graph.discoveredFiles.has("A.scad"));
  assert.ok(graph.discoveredFiles.has("B.scad"));
  assert.strictEqual(graph.parametersProcessed.size, 2);
});

test("Circular dependency - use cycle", async () => {
  const files = {
    "A.scad": { includes: [], uses: ["B.scad"] },
    "B.scad": { includes: [], uses: ["A.scad"] },
  };

  const graph = new DependencyGraph(files);
  await graph.parseRecursive("A.scad", true);

  assert.strictEqual(graph.discoveredFiles.size, 2);
  assert.strictEqual(graph.parametersProcessed.size, 1);
  assert.ok(graph.parametersProcessed.has("A.scad"));
  assert.ok(!graph.parametersProcessed.has("B.scad"));
});

test("Complex cycle - include then use", async () => {
  const files = {
    "A.scad": { includes: ["B.scad"], uses: [] },
    "B.scad": { includes: [], uses: ["A.scad"] },
  };

  const graph = new DependencyGraph(files);
  await graph.parseRecursive("A.scad", true);

  assert.strictEqual(graph.discoveredFiles.size, 2);
  assert.strictEqual(graph.parametersProcessed.size, 2);
});

test("Complex cycle - use then include", async () => {
  // If A uses B, and B includes A
  const files = {
    "A.scad": { includes: [], uses: ["B.scad"] },
    "B.scad": { includes: ["A.scad"], uses: [] },
  };

  const graph = new DependencyGraph(files);
  await graph.parseRecursive("A.scad", true);

  assert.strictEqual(graph.discoveredFiles.size, 2);
  // A is processed (started with true). 
  // B is NOT processed for parameters (A uses B).
  // B includes A -> A is already in parametersProcessed, so it skips.
  assert.strictEqual(graph.parametersProcessed.size, 1);
  assert.ok(graph.parametersProcessed.has("A.scad"));
});
