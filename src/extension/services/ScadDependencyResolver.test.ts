import test from "node:test";
import assert from "node:assert";
import * as path from "path";
import { ScadDependencyResolver } from "./ScadDependencyResolver";

test("ScadDependencyResolver - Circular dependency - include cycle", async () => {
  const files: Record<string, string> = {
    [path.resolve("/A.scad")]: "include <B.scad>",
    [path.resolve("/B.scad")]: "include <A.scad>",
  };

  const resolver = new ScadDependencyResolver({
    readFile: async (p) => files[p],
    existsSync: (p) => !!files[p],
  });

  const { discoveredFiles } = await resolver.resolve(path.resolve("/A.scad"));

  assert.strictEqual(discoveredFiles.length, 2);
  assert.ok(discoveredFiles.includes(path.resolve("/A.scad")));
  assert.ok(discoveredFiles.includes(path.resolve("/B.scad")));
});

test("ScadDependencyResolver - Circular dependency - use cycle", async () => {
  const files: Record<string, string> = {
    [path.resolve("/A.scad")]: 'use <B.scad>\nvarA = 1;',
    [path.resolve("/B.scad")]: 'use <A.scad>\nvarB = 2;',
  };

  const resolver = new ScadDependencyResolver({
    readFile: async (p) => files[p],
    existsSync: (p) => !!files[p],
  });

  const { discoveredFiles, allParameters } = await resolver.resolve(path.resolve("/A.scad"));

  assert.strictEqual(discoveredFiles.length, 2);
  assert.strictEqual(allParameters.length, 1);
  assert.strictEqual(allParameters[0].name, "varA");
});

test("ScadDependencyResolver - Complex cycle - include then use", async () => {
  const files: Record<string, string> = {
    [path.resolve("/A.scad")]: "include <B.scad>",
    [path.resolve("/B.scad")]: "use <A.scad>\nvarB = 2;",
  };

  const resolver = new ScadDependencyResolver({
    readFile: async (p) => files[p],
    existsSync: (p) => !!files[p],
  });

  const { discoveredFiles, allParameters } = await resolver.resolve(path.resolve("/A.scad"));

  assert.strictEqual(discoveredFiles.length, 2);
  assert.strictEqual(allParameters.length, 1);
  assert.strictEqual(allParameters[0].name, "varB");
});
