import { Intersection, Mesh, Plane } from "three";

/** True when the hit point lies in a region removed by the material's clipping planes. */
export function isClippedAway(hit: Intersection): boolean {
  if (!(hit.object instanceof Mesh)) return false;
  const material = hit.object.material;
  const materials = Array.isArray(material) ? material : [material];
  return materials.some((mat) =>
    mat.clippingPlanes?.some(
      (plane: Plane) => plane.distanceToPoint(hit.point) < 0,
    ),
  );
}
