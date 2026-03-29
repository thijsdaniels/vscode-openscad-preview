/* eslint-disable @typescript-eslint/no-explicit-any */
import { Group, Mesh } from "three";
import {
  RenderMode,
  ViewSettingsContext,
} from "../../contexts/ViewSettingsContext";

export class MaterialManager {
  public applyToGroup(group: Group, settings: ViewSettingsContext) {
    group.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = settings.get("shadows");
        child.receiveShadow = settings.get("shadows");
        this.applyToMesh(child, settings);
      }
    });
  }

  private applyToMesh(mesh: Mesh, viewSettings: ViewSettingsContext) {
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    materials.forEach((mat) => {
      if (mat && "wireframe" in mat) {
        (mat as any).wireframe = viewSettings.is(
          "renderMode",
          RenderMode.Wireframe,
        );
        (mat as any).transparent = viewSettings.is(
          "renderMode",
          RenderMode.XRay,
        );
        (mat as any).opacity = viewSettings.is("renderMode", RenderMode.XRay)
          ? 0.5
          : 1.0;

        if ("flatShading" in mat) {
          if (mat.userData.originalFlatShading === undefined) {
            mat.userData.originalFlatShading = (mat as any).flatShading;
          }
          (mat as any).flatShading = viewSettings.is(
            "renderMode",
            RenderMode.Wireframe,
          )
            ? false
            : mat.userData.originalFlatShading;
        }

        if (!viewSettings.get("colors")) {
          if (mat.userData.originalColor === undefined && (mat as any).color) {
            mat.userData.originalColor = (mat as any).color.clone();
            mat.userData.originalVertexColors = (mat as any).vertexColors;
          }
          if ((mat as any).color) {
            (mat as any).color.setHex(0xffffff);
          }
          if ("vertexColors" in mat) {
            (mat as any).vertexColors = false;
          }
        } else {
          if (mat.userData.originalColor !== undefined) {
            if ((mat as any).color) {
              (mat as any).color.copy(mat.userData.originalColor);
            }
            if ("vertexColors" in mat) {
              (mat as any).vertexColors = mat.userData.originalVertexColors;
            }
          }
        }

        (mat as any).needsUpdate = true;
      }
    });
  }
}
