import * as THREE from 'three';
import type { Point2D, BoundingBox } from '@pcb/domain';

// Scale factor: 1 mil = 0.001 Three.js units
const MILS_TO_UNITS = 0.001;

/** Convert a domain Point2D (mils) to a Three.js Vector3. Y becomes Z in 3D space. */
export function domainToThree(point: Point2D, z = 0): THREE.Vector3 {
  return new THREE.Vector3(
    point.x * MILS_TO_UNITS,
    z * MILS_TO_UNITS,
    point.y * MILS_TO_UNITS,
  );
}

/** Convert mils to Three.js world units. */
export function milsToUnits(mils: number): number {
  return mils * MILS_TO_UNITS;
}

/** Convert Three.js world units back to mils. */
export function unitsToMils(units: number): number {
  return units / MILS_TO_UNITS;
}

/** Convert a domain BoundingBox to Three.js Box3. */
export function boundingBoxToBox3(bb: BoundingBox, zMin = 0, zMax = 0): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(bb.min.x * MILS_TO_UNITS, zMin * MILS_TO_UNITS, bb.min.y * MILS_TO_UNITS),
    new THREE.Vector3(bb.max.x * MILS_TO_UNITS, zMax * MILS_TO_UNITS, bb.max.y * MILS_TO_UNITS),
  );
}

/** Parse a hex color string to a Three.js Color. */
export function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/** Get the center of a BoundingBox in Three.js coords. */
export function boundingBoxCenter(bb: BoundingBox, z = 0): THREE.Vector3 {
  return new THREE.Vector3(
    ((bb.min.x + bb.max.x) / 2) * MILS_TO_UNITS,
    z * MILS_TO_UNITS,
    ((bb.min.y + bb.max.y) / 2) * MILS_TO_UNITS,
  );
}

/** Get the size of a BoundingBox in Three.js units. */
export function boundingBoxSize(bb: BoundingBox): { width: number; depth: number } {
  return {
    width: (bb.max.x - bb.min.x) * MILS_TO_UNITS,
    depth: (bb.max.y - bb.min.y) * MILS_TO_UNITS,
  };
}

/** Create a rounded rectangle shape for board outlines. */
export function createRoundedRectShape(
  width: number,
  height: number,
  radius: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);

  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  return shape;
}

/** Rotation enum value (degrees) to radians. */
export function rotationToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Dispose a Three.js object and all its descendants. */
export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    }
  });
}
