import test from "node:test";
import assert from "node:assert";
import { ScadParser } from "./ScadParser";

test("ScadParser - extracts parameters successfully", () => {
  const scadContent = `
    // An un-grouped variable
    top_level_var = 42;

    /* [Dimensions] */
    width = 10; // The width of the box
    height = 20; // [1:5:50]
    
    /* [Style] */
    color = "red"; // [red:Red, blue:Blue]
    
    /* [Boolean Options] */
    enable_feature = true; // Should feature be enabled?
    enable_other_feature = false; // [true, false]

    /* [Hidden] */
    internal_var = 5;
    
    module helper() {
      ignored_var = 10; // [1:10]
    }
  `;

  const parser = new ScadParser(scadContent);

  assert.deepStrictEqual(parser.parameters, [
    {
      name: "top_level_var",
      type: "number",
      group: undefined,
      value: 42,
    },
    {
      name: "width",
      type: "number",
      group: "Dimensions",
      value: 10,
      description: "The width of the box",
    },
    {
      name: "height",
      type: "number",
      group: "Dimensions",
      value: 20,
      min: 1,
      max: 50,
      step: 5,
    },
    {
      name: "color",
      type: "string",
      group: "Style",
      value: "red",
      options: [
        { value: "red", label: "Red" },
        { value: "blue", label: "Blue" },
      ],
    },
    {
      name: "enable_feature",
      type: "boolean",
      group: "Boolean Options",
      value: true,
      description: "Should feature be enabled?",
    },
    {
      name: "enable_other_feature",
      type: "boolean",
      group: "Boolean Options",
      value: false,
    },
  ]);
});

test("ScadParser - skips expression-valued variables", () => {
  const scadContent = `
    // Literal values — these should be included
    full_width = 254;
    surface_thickness = 3.5;
    label = "default";

    // Expression values — these must be skipped so OpenSCAD computes them
    shelf_depth = device_depth + surface_thickness + width_extra_clearance;
    inner_width_w_clearance = device_width + width_extra_clearance;
    second_screw_height = screw_step_height + first_screw_height;
    side_panel_shape = rect([side_panel_height, side_panel_depth]);
    back_blocks = [[40, 80]];
  `;

  const parser = new ScadParser(scadContent);

  assert.deepStrictEqual(parser.parameters, [
    { name: "full_width", type: "number", group: undefined, value: 254 },
    { name: "surface_thickness", type: "number", group: undefined, value: 3.5 },
    { name: "label", type: "string", group: undefined, value: "default" },
  ]);
});

test("ScadParser - handles malformed contents defensively", () => {
  const scadContent = `
    /* [Weird Stuff] */
    no_value_var;
    malformed =;
    = missing_name;
    "not a variable declaration";
    // [1:10] (orphan comment)
  `;

  const parser = new ScadParser(scadContent);

  assert.deepStrictEqual(parser.parameters, []);
});
