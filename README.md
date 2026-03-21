# OpenSCAD Preview

An interactive 3D preview environment for OpenSCAD (`.scad`) files right inside Visual Studio Code.

## Features
- Real-time or on-demand 3D rendering of your `.scad` models.
- Support for syntax highlighting and snippets.
- Interactive camera controls.
- Export to 3D printing formats directly from the preview (if supported).

## Requirements
- Currently requires an OpenSCAD installation on your system.
- To use the 3MF preview format (which supports colors), you need OpenSCAD Nightly. Otherwise, you can use the universally supported STL format.

## Extension Settings

This extension contributes the following settings:

* `openscad.previewFormat`: The format to use for the 3D preview. Options are `3mf` (default) or `stl`.
* `openscad.slicerExecutable`: Optional path to the slicer executable (e.g., Bambu Studio or PrusaSlicer). If left empty, the OS default application for the 3D model will be used.

## Usage
Open any `.scad` file, and either trigger the `Show OpenSCAD Preview` command from the command palette or click the preview icon in the editor title bar.
