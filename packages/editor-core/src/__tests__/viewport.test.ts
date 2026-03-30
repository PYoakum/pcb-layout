import { describe, it, expect } from 'vitest';
import {
  createViewport,
  pan,
  zoomTo,
  screenToWorld,
  worldToScreen,
  fitToContent,
} from '../viewport';
import type { ViewportState } from '../viewport';

describe('pan', () => {
  it('pans by the given delta', () => {
    const v = createViewport();
    const result = pan(v, 100, -50);
    expect(result.x).toBe(100);
    expect(result.y).toBe(-50);
  });

  it('accumulates panning', () => {
    const v = createViewport({ x: 10, y: 20 });
    const result = pan(v, 5, 15);
    expect(result.x).toBe(15);
    expect(result.y).toBe(35);
  });

  it('does not modify zoom', () => {
    const v = createViewport({ zoom: 2 });
    const result = pan(v, 100, 100);
    expect(result.zoom).toBe(2);
  });
});

describe('zoomTo', () => {
  it('sets the zoom level', () => {
    const v = createViewport();
    const result = zoomTo(v, 2);
    expect(result.zoom).toBe(2);
  });

  it('clamps to minimum zoom', () => {
    const v = createViewport({ minZoom: 0.1 });
    const result = zoomTo(v, 0.001);
    expect(result.zoom).toBe(0.1);
  });

  it('clamps to maximum zoom', () => {
    const v = createViewport({ maxZoom: 10 });
    const result = zoomTo(v, 100);
    expect(result.zoom).toBe(10);
  });

  it('adjusts position for focal point', () => {
    const v = createViewport({ x: 0, y: 0, zoom: 1 });
    const result = zoomTo(v, 2, { x: 400, y: 300 });
    // Focal point should stay in the same screen position
    expect(result.zoom).toBe(2);
    // x = focalPoint.x - (focalPoint.x - state.x) * scale
    // x = 400 - (400 - 0) * 2 = 400 - 800 = -400
    expect(result.x).toBe(-400);
    expect(result.y).toBe(-300);
  });

  it('without focal point does not adjust position', () => {
    const v = createViewport({ x: 50, y: 60 });
    const result = zoomTo(v, 3);
    expect(result.x).toBe(50);
    expect(result.y).toBe(60);
  });
});

describe('screenToWorld / worldToScreen', () => {
  it('converts screen to world at zoom 1 with no pan', () => {
    const v = createViewport();
    const world = screenToWorld({ x: 100, y: 200 }, v);
    expect(world).toEqual({ x: 100, y: 200 });
  });

  it('accounts for zoom', () => {
    const v = createViewport({ zoom: 2 });
    const world = screenToWorld({ x: 200, y: 400 }, v);
    expect(world).toEqual({ x: 100, y: 200 });
  });

  it('accounts for pan offset', () => {
    const v = createViewport({ x: 50, y: 100 });
    const world = screenToWorld({ x: 150, y: 200 }, v);
    expect(world).toEqual({ x: 100, y: 100 });
  });

  it('round-trips screen -> world -> screen', () => {
    const v = createViewport({ x: 37, y: -15, zoom: 2.5 });
    const screen = { x: 400, y: 300 };
    const world = screenToWorld(screen, v);
    const backToScreen = worldToScreen(world, v);
    expect(backToScreen.x).toBeCloseTo(screen.x);
    expect(backToScreen.y).toBeCloseTo(screen.y);
  });

  it('round-trips world -> screen -> world', () => {
    const v = createViewport({ x: -100, y: 200, zoom: 0.5 });
    const world = { x: 500, y: 800 };
    const screen = worldToScreen(world, v);
    const backToWorld = screenToWorld(screen, v);
    expect(backToWorld.x).toBeCloseTo(world.x);
    expect(backToWorld.y).toBeCloseTo(world.y);
  });
});

describe('fitToContent', () => {
  it('calculates correct zoom and centers content', () => {
    const v = createViewport();
    const bounds = { min: { x: 100, y: 100 }, max: { x: 500, y: 400 } };
    const result = fitToContent(v, bounds, 800, 600, 40);

    // contentW = 400, contentH = 300
    // scaleX = (800 - 80) / 400 = 1.8
    // scaleY = (600 - 80) / 300 = 1.733...
    // zoom = min(1.8, 1.733) = 1.733
    const expectedZoom = Math.min(720 / 400, 520 / 300);
    expect(result.zoom).toBeCloseTo(expectedZoom);

    // cx = (100+500)/2 = 300, cy = (100+400)/2 = 250
    // x = 400 - 300 * zoom, y = 300 - 250 * zoom
    expect(result.x).toBeCloseTo(800 / 2 - 300 * expectedZoom);
    expect(result.y).toBeCloseTo(600 / 2 - 250 * expectedZoom);
  });

  it('returns unchanged state for zero-size bounds', () => {
    const v = createViewport({ x: 10, y: 20, zoom: 3 });
    const bounds = { min: { x: 100, y: 100 }, max: { x: 100, y: 100 } };
    const result = fitToContent(v, bounds, 800, 600);
    expect(result).toEqual(v);
  });

  it('clamps zoom to min/max', () => {
    const v = createViewport({ minZoom: 0.5, maxZoom: 5 });
    // Very large content relative to screen -> zoom would be very small
    const bounds = { min: { x: 0, y: 0 }, max: { x: 100000, y: 100000 } };
    const result = fitToContent(v, bounds, 800, 600);
    expect(result.zoom).toBeGreaterThanOrEqual(0.5);
  });
});
