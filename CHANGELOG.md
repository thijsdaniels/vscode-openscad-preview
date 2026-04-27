# vscode-openscad-preview

## 0.5.0

### Minor Changes

- 752b386: A new X-Ray render mode has been added alongside the existing Solid and Wireframe modes.
- 752b386: The side panel has been reorganised into three tabs: Scene, Parameters, and Object Properties.
- 752b386: Multiple cross-section planes can now coexist in a scene, each with its own transform and properties. Cap rendering has been reworked with per-plane stencil isolation so intersecting planes no longer produce fill artifacts.
- 752b386: Lights are now first-class scene objects. Ambient, directional, spot, and point lights can be added, removed, repositioned, and configured individually from the Scene tab.
- 752b386: Measurements are now persistent scene objects rather than a transient two-point overlay. Each measurement shows up in the scene tree, exposes its endpoints and derived deltas in the Object Properties panel, and the Measure tool supports vertex, edge, and face snapping.
- 752b386: View options (render mode, environment, shadows, projection) have been moved from the extension toolbar into a compact overlay in the top-right corner of the viewport.
- 752b386: A tool strip has been added to the left edge of the viewport with Select, Move, Rotate, Scale, and Measure tools. The transform tools attach a gizmo to the selected scene object for direct manipulation.
- 752b386: Cameras are now scene objects, and multiple cameras can coexist in a scene. The active camera can be switched from the viewport overlay.
- 752b386: Scenes are now persisted per document. Camera positions, lights, cross-section planes, and measurements survive closing and reopening the preview tab.

### Patch Changes

- 752b386: The default OpenSCAD executable paths on Windows now include the `OpenSCAD (Nightly)` install directory under both `Program Files` and `Program Files (x86)`.
- 752b386: The file watcher now tolerates the brief window during atomic editor saves where the watched file is momentarily missing, instead of throwing.

## 0.4.0

### Minor Changes

- 807e7fd: An interactive cross-section has been added.

## 0.3.0

### Minor Changes

- 7fc6e0c: Layout and several UI elements have been improved.

## 0.2.1

### Patch Changes

- 7190d89: The last render is now displayed when the tab regains focus.

## 0.2.0

### Minor Changes

- 5f152c8: The path to the openscad executable is now detected in various expected locations and can also be manually configured.

## 0.1.2

### Patch Changes

- 5dc6fb1: Include codicons in dist.
- 5dc6fb1: Widen supported engine version to ^1.105.1 for Cursor and Antigravity users.

## 0.1.1

### Patch Changes

- e8c5372: Additional information has been added to the readme.

## 0.1.0

### Minor Changes

- efee0bf: Parameter sets are now supported.
- df2225b: Initial release: Added fully themed, interactive 3D preview for OpenSCAD (`.scad`) files inside the editor, with support for 3MF and STL model rendering and exporting, as well as sending the model straight to a slicer. Parameters can be tweaked in the UI. Basic syntax highlighting and common snippets are included.
