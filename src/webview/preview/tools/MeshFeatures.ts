import { BufferGeometry, EdgesGeometry, Vector3 } from "three";

/**
 * Minimum angle (degrees) between two faces for their shared edge to count as
 * a real edge of the model. Coplanar triangulation diagonals fall below it;
 * facets of a curved surface ($fn = 360 → 1°) stay above it.
 */
const FEATURE_ANGLE = 0.5;

/** Real edges and corners of a mesh, in the geometry's local space. */
export interface MeshFeatures {
  /** Segment endpoints, two per edge. */
  edges: Vector3[];
  /** Unique edge endpoints. */
  vertices: Vector3[];
}

const cache = new WeakMap<BufferGeometry, MeshFeatures>();

/** Feature edges and vertices of a geometry, computed once and cached. */
export function meshFeatures(geometry: BufferGeometry): MeshFeatures {
  const cached = cache.get(geometry);
  if (cached) return cached;

  const edgesGeometry = new EdgesGeometry(geometry, FEATURE_ANGLE);
  const positions = edgesGeometry.attributes.position;
  const edges: Vector3[] = [];
  const unique = new Map<string, Vector3>();
  for (let i = 0; i < positions.count; i++) {
    const v = new Vector3(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i),
    );
    edges.push(v);
    unique.set(`${v.x},${v.y},${v.z}`, v);
  }
  edgesGeometry.dispose();

  const features = { edges, vertices: [...unique.values()] };
  cache.set(geometry, features);
  return features;
}
