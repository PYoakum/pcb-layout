import type { Point2D, BoundingBox, Transform2D } from '@pcb/domain';

/** Check whether two axis-aligned bounding boxes overlap. */
export function boundingBoxOverlap(a: BoundingBox, b: BoundingBox): boolean {
  return a.min.x < b.max.x && a.max.x > b.min.x &&
         a.min.y < b.max.y && a.max.y > b.min.y;
}

/** Euclidean distance between two points. */
export function distanceBetweenPoints(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Test if a point lies inside (or on the edge of) a bounding box. */
export function pointInBoundingBox(point: Point2D, box: BoundingBox): boolean {
  return point.x >= box.min.x && point.x <= box.max.x &&
         point.y >= box.min.y && point.y <= box.max.y;
}

/** Transform a bounding box by a Transform2D (position + rotation + mirror). */
export function transformBoundingBox(box: BoundingBox, transform: Transform2D): BoundingBox {
  // Compute the four corners relative to the component origin
  const corners: Point2D[] = [
    { x: box.min.x, y: box.min.y },
    { x: box.max.x, y: box.min.y },
    { x: box.max.x, y: box.max.y },
    { x: box.min.x, y: box.max.y },
  ];

  const rad = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const transformed = corners.map((c) => {
    let x = c.x;
    let y = c.y;

    // Mirror about Y axis if needed
    if (transform.mirrored) {
      x = -x;
    }

    // Rotate
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    // Translate
    return { x: rx + transform.position.x, y: ry + transform.position.y };
  });

  const xs = transformed.map((p) => p.x);
  const ys = transformed.map((p) => p.y);

  return {
    min: { x: Math.min(...xs), y: Math.min(...ys) },
    max: { x: Math.max(...xs), y: Math.max(...ys) },
  };
}

/**
 * Minimum distance between two line segments.
 * Each segment is defined by two endpoints.
 */
export function segmentDistance(
  s1Start: Point2D, s1End: Point2D,
  s2Start: Point2D, s2End: Point2D,
): number {
  // If segments intersect the distance is 0
  if (segmentsIntersect(s1Start, s1End, s2Start, s2End)) {
    return 0;
  }

  // Otherwise it's the minimum of point-to-segment distances for all 4 combos
  return Math.min(
    pointToSegmentDistance(s1Start, s2Start, s2End),
    pointToSegmentDistance(s1End, s2Start, s2End),
    pointToSegmentDistance(s2Start, s1Start, s1End),
    pointToSegmentDistance(s2End, s1Start, s1End),
  );
}

/** Distance from a point to the closest point on a line segment. */
export function pointToSegmentDistance(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distanceBetweenPoints(p, a);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return distanceBetweenPoints(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Check if two line segments intersect using cross-product orientation test. */
function segmentsIntersect(a1: Point2D, a2: Point2D, b1: Point2D, b2: Point2D): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && onSegment(b1, b2, a1)) return true;
  if (d2 === 0 && onSegment(b1, b2, a2)) return true;
  if (d3 === 0 && onSegment(a1, a2, b1)) return true;
  if (d4 === 0 && onSegment(a1, a2, b2)) return true;

  return false;
}

function cross(a: Point2D, b: Point2D, c: Point2D): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Point2D, b: Point2D, p: Point2D): boolean {
  return Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) &&
         Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
}

/** Transform a local pad position into world coordinates. */
export function padWorldPosition(padLocal: Point2D, transform: Transform2D): Point2D {
  let x = padLocal.x;
  let y = padLocal.y;
  if (transform.mirrored) x = -x;
  const rad = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: x * cos - y * sin + transform.position.x,
    y: x * sin + y * cos + transform.position.y,
  };
}

/** Minimum distance from a point to an axis-aligned bounding box. */
export function pointToBoundingBoxDistance(p: Point2D, box: BoundingBox): number {
  const cx = Math.max(box.min.x, Math.min(p.x, box.max.x));
  const cy = Math.max(box.min.y, Math.min(p.y, box.max.y));
  return distanceBetweenPoints(p, { x: cx, y: cy });
}

/** Minimum distance between two axis-aligned bounding boxes. */
export function boundingBoxDistance(a: BoundingBox, b: BoundingBox): number {
  if (boundingBoxOverlap(a, b)) return 0;

  const dx = Math.max(0, Math.max(a.min.x - b.max.x, b.min.x - a.max.x));
  const dy = Math.max(0, Math.max(a.min.y - b.max.y, b.min.y - a.max.y));
  return Math.sqrt(dx * dx + dy * dy);
}
