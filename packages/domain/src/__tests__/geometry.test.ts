import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  rotatePoint,
  normalizeRotation,
  Rotation,
} from '../types/geometry';
import type { GridConfig, Point2D } from '../types/geometry';

const defaultGrid: GridConfig = {
  spacingX: 5,
  spacingY: 5,
  subdivisions: 2,
  visible: true,
  snapEnabled: true,
};

describe('snapToGrid', () => {
  it('snaps a point to the nearest grid intersection', () => {
    const result = snapToGrid({ x: 73, y: 118 }, defaultGrid);
    expect(result).toEqual({ x: 75, y: 120 });
  });

  it('handles point already on grid', () => {
    const result = snapToGrid({ x: 100, y: 200 }, defaultGrid);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('handles the origin (0, 0)', () => {
    const result = snapToGrid({ x: 0, y: 0 }, defaultGrid);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('handles negative coordinates', () => {
    const result = snapToGrid({ x: -73, y: -118 }, defaultGrid);
    expect(result).toEqual({ x: -75, y: -120 });
  });

  it('rounds to nearest, not floor', () => {
    // 3 is closer to 5 than 0 with spacing 5
    const result = snapToGrid({ x: 3, y: 3 }, defaultGrid);
    expect(result).toEqual({ x: 5, y: 5 });
  });

  it('supports different X and Y spacing', () => {
    const grid: GridConfig = { ...defaultGrid, spacingX: 100, spacingY: 25 };
    const result = snapToGrid({ x: 130, y: 38 }, grid);
    expect(result).toEqual({ x: 100, y: 50 });
  });
});

describe('rotatePoint', () => {
  const origin: Point2D = { x: 0, y: 0 };

  it('returns the same point for 0 degrees', () => {
    const result = rotatePoint({ x: 100, y: 0 }, origin, Rotation.R0);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(0);
  });

  it('rotates 90 degrees around origin', () => {
    const result = rotatePoint({ x: 100, y: 0 }, origin, Rotation.R90);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(100);
  });

  it('rotates 180 degrees around origin', () => {
    const result = rotatePoint({ x: 100, y: 50 }, origin, Rotation.R180);
    expect(result.x).toBeCloseTo(-100);
    expect(result.y).toBeCloseTo(-50);
  });

  it('rotates 270 degrees around origin', () => {
    const result = rotatePoint({ x: 0, y: 100 }, origin, Rotation.R270);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(0);
  });

  it('rotates around an offset origin', () => {
    const center: Point2D = { x: 50, y: 50 };
    const result = rotatePoint({ x: 100, y: 50 }, center, Rotation.R90);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(100);
  });

  it('rotating a point at the origin returns the origin', () => {
    const result = rotatePoint({ x: 0, y: 0 }, origin, Rotation.R90);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });
});

describe('normalizeRotation', () => {
  it('returns 0 for 0 degrees', () => {
    expect(normalizeRotation(0)).toBe(Rotation.R0);
  });

  it('returns 90 for 90 degrees', () => {
    expect(normalizeRotation(90)).toBe(Rotation.R90);
  });

  it('returns 180 for 180 degrees', () => {
    expect(normalizeRotation(180)).toBe(Rotation.R180);
  });

  it('returns 270 for 270 degrees', () => {
    expect(normalizeRotation(270)).toBe(Rotation.R270);
  });

  it('normalizes 360 to 0', () => {
    expect(normalizeRotation(360)).toBe(Rotation.R0);
  });

  it('normalizes values greater than 360', () => {
    expect(normalizeRotation(450)).toBe(Rotation.R90);
    expect(normalizeRotation(720)).toBe(Rotation.R0);
  });

  it('normalizes negative degrees', () => {
    expect(normalizeRotation(-90)).toBe(Rotation.R270);
    expect(normalizeRotation(-180)).toBe(Rotation.R180);
    expect(normalizeRotation(-270)).toBe(Rotation.R90);
  });

  it('snaps to nearest 90-degree increment', () => {
    expect(normalizeRotation(44)).toBe(Rotation.R0);
    expect(normalizeRotation(46)).toBe(Rotation.R90);
    expect(normalizeRotation(135)).toBe(Rotation.R180);
  });
});
