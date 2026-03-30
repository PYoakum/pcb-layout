import { describe, it, expect } from 'vitest';
import { snapToGrid, snapToNearest, snapPoint, SnapTargetType } from '../snap';
import type { SnapCandidate } from '../snap';
import type { GridConfig } from '@pcb/domain';

const grid: GridConfig = {
  spacingX: 50,
  spacingY: 50,
  subdivisions: 2,
  visible: true,
  snapEnabled: true,
};

const gridNoSnap: GridConfig = { ...grid, snapEnabled: false };

describe('snapToGrid', () => {
  it('snaps to grid spacing', () => {
    const result = snapToGrid({ x: 73, y: 118 }, grid);
    expect(result.point).toEqual({ x: 50, y: 100 });
    expect(result.snappedTo).not.toBeNull();
    expect(result.snappedTo!.type).toBe(SnapTargetType.Grid);
    expect(result.axis).toBe('both');
  });

  it('returns original point when snap is disabled', () => {
    const result = snapToGrid({ x: 73, y: 118 }, gridNoSnap);
    expect(result.point).toEqual({ x: 73, y: 118 });
    expect(result.snappedTo).toBeNull();
    expect(result.axis).toBeNull();
  });

  it('reports axis as null when point is already on grid', () => {
    const result = snapToGrid({ x: 100, y: 200 }, grid);
    expect(result.point).toEqual({ x: 100, y: 200 });
    expect(result.axis).toBeNull();
  });

  it('reports correct axis when only x snaps', () => {
    // y already on grid, x needs snapping
    const result = snapToGrid({ x: 73, y: 100 }, grid);
    expect(result.point).toEqual({ x: 50, y: 100 });
    expect(result.axis).toBe('x');
  });

  it('reports correct axis when only y snaps', () => {
    const result = snapToGrid({ x: 100, y: 118 }, grid);
    expect(result.point).toEqual({ x: 100, y: 100 });
    expect(result.axis).toBe('y');
  });
});

describe('snapToNearest', () => {
  const candidates: SnapCandidate[] = [
    { id: 'pad_1', point: { x: 100, y: 100 }, type: SnapTargetType.PadCenter },
    { id: 'pad_2', point: { x: 300, y: 300 }, type: SnapTargetType.PadCenter },
  ];

  it('finds the nearest candidate within threshold', () => {
    const result = snapToNearest({ x: 105, y: 103 }, candidates, 20);
    expect(result.point).toEqual({ x: 100, y: 100 });
    expect(result.snappedTo).not.toBeNull();
    expect(result.snappedTo!.id).toBe('pad_1');
  });

  it('returns null when no candidates within threshold', () => {
    const result = snapToNearest({ x: 200, y: 200 }, candidates, 10);
    expect(result.snappedTo).toBeNull();
    expect(result.point).toEqual({ x: 200, y: 200 });
  });

  it('picks the closest when multiple are within threshold', () => {
    const close: SnapCandidate[] = [
      { id: 'a', point: { x: 10, y: 10 }, type: SnapTargetType.PadCenter },
      { id: 'b', point: { x: 5, y: 5 }, type: SnapTargetType.TraceEndpoint },
    ];
    const result = snapToNearest({ x: 4, y: 4 }, close, 20);
    expect(result.snappedTo!.id).toBe('b');
  });

  it('handles empty candidates array', () => {
    const result = snapToNearest({ x: 100, y: 100 }, [], 20);
    expect(result.snappedTo).toBeNull();
  });
});

describe('snapPoint', () => {
  it('prefers nearest candidate over grid when available', () => {
    const candidates: SnapCandidate[] = [
      { id: 'pad_1', point: { x: 103, y: 98 }, type: SnapTargetType.PadCenter },
    ];
    const result = snapPoint({ x: 105, y: 100 }, candidates, 20, grid);
    expect(result.snappedTo).not.toBeNull();
    expect(result.snappedTo!.id).toBe('pad_1');
    expect(result.point).toEqual({ x: 103, y: 98 });
  });

  it('falls back to grid when no candidates within threshold', () => {
    const candidates: SnapCandidate[] = [
      { id: 'pad_1', point: { x: 1000, y: 1000 }, type: SnapTargetType.PadCenter },
    ];
    const result = snapPoint({ x: 73, y: 118 }, candidates, 20, grid);
    expect(result.point).toEqual({ x: 50, y: 100 });
    expect(result.snappedTo).not.toBeNull();
    expect(result.snappedTo!.type).toBe(SnapTargetType.Grid);
  });

  it('returns original point when no candidates and snap disabled', () => {
    const result = snapPoint({ x: 73, y: 118 }, [], 20, gridNoSnap);
    expect(result.point).toEqual({ x: 73, y: 118 });
    expect(result.snappedTo).toBeNull();
  });
});
