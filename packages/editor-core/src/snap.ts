import type { Point2D, GridConfig } from '@pcb/domain';
import { snapToGrid as domainSnapToGrid } from '@pcb/domain';

export interface SnapResult {
  point: Point2D;
  snappedTo: SnapTarget | null;
  axis: 'x' | 'y' | 'both' | null;
}

export interface SnapTarget {
  id: string;
  point: Point2D;
  type: SnapTargetType;
}

export enum SnapTargetType {
  Grid = 'grid',
  PadCenter = 'pad_center',
  TraceEndpoint = 'trace_endpoint',
  ComponentOrigin = 'component_origin',
}

export interface SnapCandidate {
  id: string;
  point: Point2D;
  type: SnapTargetType;
}

/**
 * Snap a point to the grid. Delegates to the domain snapToGrid
 * but wraps the result in a SnapResult.
 */
export function snapToGrid(point: Point2D, gridConfig: GridConfig): SnapResult {
  if (!gridConfig.snapEnabled) {
    return { point, snappedTo: null, axis: null };
  }
  const snapped = domainSnapToGrid(point, gridConfig);
  const snappedX = snapped.x !== point.x;
  const snappedY = snapped.y !== point.y;
  const axis = snappedX && snappedY ? 'both' : snappedX ? 'x' : snappedY ? 'y' : null;

  return {
    point: snapped,
    snappedTo: axis
      ? { id: 'grid', point: snapped, type: SnapTargetType.Grid }
      : null,
    axis,
  };
}

/**
 * Snap to the nearest candidate within a given threshold (in world units / mils).
 * Returns the closest candidate if within threshold, otherwise returns the
 * original point.
 */
export function snapToNearest(
  point: Point2D,
  candidates: SnapCandidate[],
  threshold: number,
): SnapResult {
  let bestDist = Infinity;
  let bestCandidate: SnapCandidate | null = null;

  for (const c of candidates) {
    const dx = c.point.x - point.x;
    const dy = c.point.y - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      bestCandidate = c;
    }
  }

  if (!bestCandidate) {
    return { point, snappedTo: null, axis: null };
  }

  const dx = Math.abs(bestCandidate.point.x - point.x);
  const dy = Math.abs(bestCandidate.point.y - point.y);
  const axis = dx > 0.01 && dy > 0.01 ? 'both' : dx > 0.01 ? 'x' : dy > 0.01 ? 'y' : 'both';

  return {
    point: bestCandidate.point,
    snappedTo: {
      id: bestCandidate.id,
      point: bestCandidate.point,
      type: bestCandidate.type,
    },
    axis,
  };
}

/**
 * Combined snap: try candidates first, fall back to grid.
 */
export function snapPoint(
  point: Point2D,
  candidates: SnapCandidate[],
  threshold: number,
  gridConfig: GridConfig,
): SnapResult {
  const nearest = snapToNearest(point, candidates, threshold);
  if (nearest.snappedTo) return nearest;
  return snapToGrid(point, gridConfig);
}
