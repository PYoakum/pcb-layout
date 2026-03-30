import { describe, it, expect } from 'vitest';
import {
  boundingBoxOverlap,
  distanceBetweenPoints,
  pointInBoundingBox,
  transformBoundingBox,
  segmentDistance,
} from '../utils';
import { Rotation } from '@pcb/domain';
import type { BoundingBox, Transform2D } from '@pcb/domain';

describe('boundingBoxOverlap', () => {
  it('returns true for overlapping boxes', () => {
    const a: BoundingBox = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    const b: BoundingBox = { min: { x: 50, y: 50 }, max: { x: 150, y: 150 } };
    expect(boundingBoxOverlap(a, b)).toBe(true);
  });

  it('returns false for separate boxes', () => {
    const a: BoundingBox = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    const b: BoundingBox = { min: { x: 200, y: 200 }, max: { x: 300, y: 300 } };
    expect(boundingBoxOverlap(a, b)).toBe(false);
  });

  it('returns false for touching edges (strict inequality)', () => {
    const a: BoundingBox = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    const b: BoundingBox = { min: { x: 100, y: 0 }, max: { x: 200, y: 100 } };
    expect(boundingBoxOverlap(a, b)).toBe(false);
  });

  it('returns true when one box is fully inside the other', () => {
    const a: BoundingBox = { min: { x: 0, y: 0 }, max: { x: 200, y: 200 } };
    const b: BoundingBox = { min: { x: 50, y: 50 }, max: { x: 100, y: 100 } };
    expect(boundingBoxOverlap(a, b)).toBe(true);
  });
});

describe('distanceBetweenPoints', () => {
  it('computes known distances', () => {
    expect(distanceBetweenPoints({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
    expect(distanceBetweenPoints({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(100);
  });

  it('returns 0 for the same point', () => {
    expect(distanceBetweenPoints({ x: 42, y: 17 }, { x: 42, y: 17 })).toBe(0);
  });

  it('handles negative coordinates', () => {
    expect(distanceBetweenPoints({ x: -3, y: 0 }, { x: 0, y: 4 })).toBeCloseTo(5);
  });
});

describe('pointInBoundingBox', () => {
  const box: BoundingBox = { min: { x: 10, y: 10 }, max: { x: 100, y: 100 } };

  it('returns true for point inside', () => {
    expect(pointInBoundingBox({ x: 50, y: 50 }, box)).toBe(true);
  });

  it('returns false for point outside', () => {
    expect(pointInBoundingBox({ x: 200, y: 200 }, box)).toBe(false);
  });

  it('returns true for point on edge', () => {
    expect(pointInBoundingBox({ x: 10, y: 50 }, box)).toBe(true);
    expect(pointInBoundingBox({ x: 100, y: 100 }, box)).toBe(true);
  });

  it('returns true for point on corner', () => {
    expect(pointInBoundingBox({ x: 10, y: 10 }, box)).toBe(true);
  });
});

describe('transformBoundingBox', () => {
  const box: BoundingBox = { min: { x: -50, y: -25 }, max: { x: 50, y: 25 } };

  it('translates without rotation', () => {
    const t: Transform2D = { position: { x: 100, y: 200 }, rotation: Rotation.R0, mirrored: false };
    const result = transformBoundingBox(box, t);
    expect(result.min.x).toBeCloseTo(50);
    expect(result.min.y).toBeCloseTo(175);
    expect(result.max.x).toBeCloseTo(150);
    expect(result.max.y).toBeCloseTo(225);
  });

  it('rotates 90 degrees', () => {
    const t: Transform2D = { position: { x: 0, y: 0 }, rotation: Rotation.R90, mirrored: false };
    const result = transformBoundingBox(box, t);
    // After 90 rotation, width and height swap
    expect(result.min.x).toBeCloseTo(-25);
    expect(result.min.y).toBeCloseTo(-50);
    expect(result.max.x).toBeCloseTo(25);
    expect(result.max.y).toBeCloseTo(50);
  });

  it('rotates 180 degrees', () => {
    const t: Transform2D = { position: { x: 0, y: 0 }, rotation: Rotation.R180, mirrored: false };
    const result = transformBoundingBox(box, t);
    expect(result.min.x).toBeCloseTo(-50);
    expect(result.min.y).toBeCloseTo(-25);
    expect(result.max.x).toBeCloseTo(50);
    expect(result.max.y).toBeCloseTo(25);
  });

  it('rotates 270 degrees', () => {
    const t: Transform2D = { position: { x: 0, y: 0 }, rotation: Rotation.R270, mirrored: false };
    const result = transformBoundingBox(box, t);
    expect(result.min.x).toBeCloseTo(-25);
    expect(result.min.y).toBeCloseTo(-50);
    expect(result.max.x).toBeCloseTo(25);
    expect(result.max.y).toBeCloseTo(50);
  });
});

describe('segmentDistance', () => {
  it('returns 0 for intersecting segments', () => {
    const dist = segmentDistance(
      { x: 0, y: 0 }, { x: 100, y: 100 },
      { x: 100, y: 0 }, { x: 0, y: 100 },
    );
    expect(dist).toBe(0);
  });

  it('computes distance for parallel segments', () => {
    const dist = segmentDistance(
      { x: 0, y: 0 }, { x: 100, y: 0 },
      { x: 0, y: 50 }, { x: 100, y: 50 },
    );
    expect(dist).toBeCloseTo(50);
  });

  it('computes distance for perpendicular non-intersecting segments', () => {
    // Horizontal segment at y=0, x from 0 to 100
    // Vertical segment at x=50, y from 20 to 80
    const dist = segmentDistance(
      { x: 0, y: 0 }, { x: 100, y: 0 },
      { x: 50, y: 20 }, { x: 50, y: 80 },
    );
    expect(dist).toBeCloseTo(20);
  });

  it('returns 0 for overlapping collinear segments', () => {
    const dist = segmentDistance(
      { x: 0, y: 0 }, { x: 100, y: 0 },
      { x: 50, y: 0 }, { x: 150, y: 0 },
    );
    expect(dist).toBe(0);
  });

  it('computes distance between endpoints of separated segments', () => {
    const dist = segmentDistance(
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 13, y: 4 }, { x: 20, y: 4 },
    );
    expect(dist).toBeCloseTo(5); // distance from (10,0) to (13,4) = 5
  });
});
