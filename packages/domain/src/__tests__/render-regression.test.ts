import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestBoard,
  createTestBoardLayer,
  createTestComponent,
  createTestTracePath,
  createTestTraceSegment,
  createTestVia,
  resetIdCounter,
} from './fixtures';
import { LayerType, Rotation, PadShape, FillPattern } from '../index';
import type { Component, TracePath, BoardLayer, Via } from '../index';

/**
 * Regression tests that verify domain data structures are correct for rendering.
 * These test the data layer that both 2D (PixiJS) and 3D (Three.js) renderers consume.
 * No canvas/WebGL needed — we verify the shapes, positions, and layer assignments.
 */
describe('Render data regression', () => {
  beforeEach(() => resetIdCounter());

  describe('Component rendering data', () => {
    it('component has correct screen-space position for rendering', () => {
      const comp = createTestComponent({
        transform: { position: { x: 500, y: 300 }, rotation: Rotation.R0, mirrored: false },
      });
      expect(comp.transform.position).toEqual({ x: 500, y: 300 });
      expect(comp.transform.rotation).toBe(0);
    });

    it('rotated component preserves footprint geometry', () => {
      const comp = createTestComponent({
        transform: { position: { x: 100, y: 100 }, rotation: Rotation.R90, mirrored: false },
      });
      // Footprint bounding box should remain the same (rotation applied at render time)
      expect(comp.footprint.boundingBox.min).toEqual({ x: -60, y: -30 });
      expect(comp.footprint.boundingBox.max).toEqual({ x: 60, y: 30 });
      expect(comp.transform.rotation).toBe(90);
    });

    it('component pads have correct shapes for rendering', () => {
      const comp = createTestComponent();
      expect(comp.footprint.pads.length).toBe(2);
      for (const pad of comp.footprint.pads) {
        expect(pad.shape).toBe(PadShape.Circle);
        expect(pad.width).toBeGreaterThan(0);
        expect(pad.height).toBeGreaterThan(0);
      }
    });

    it('component designator is set for silkscreen rendering', () => {
      const comp = createTestComponent({ designator: 'U3' });
      expect(comp.designator).toBe('U3');
    });

    it('component with drill holes has drillDiameter on pads', () => {
      const comp = createTestComponent();
      const padWithDrill = { ...comp.footprint.pads[0], drillDiameter: 20 };
      comp.footprint.pads[0] = padWithDrill;
      expect(comp.footprint.pads[0].drillDiameter).toBe(20);
    });
  });

  describe('Trace rendering data', () => {
    it('trace segments have start/end points and width for rendering', () => {
      const path = createTestTracePath();
      expect(path.segments.length).toBeGreaterThan(0);
      for (const seg of path.segments) {
        expect(seg.start).toBeDefined();
        expect(seg.end).toBeDefined();
        expect(seg.width).toBeGreaterThan(0);
      }
    });

    it('multi-segment traces share endpoints', () => {
      const pathId = 'trace_ms' as any;
      const layerId = 'layer_1' as any;
      const seg1 = createTestTraceSegment({ pathId, layerId, start: { x: 0, y: 0 }, end: { x: 100, y: 0 } });
      const seg2 = createTestTraceSegment({ pathId, layerId, start: { x: 100, y: 0 }, end: { x: 100, y: 100 } });
      const path = createTestTracePath({ id: pathId, segments: [seg1, seg2] });

      expect(path.segments[0].end).toEqual(path.segments[1].start);
    });

    it('traces with vias have via position at segment junction', () => {
      const pathId = 'trace_v' as any;
      const topId = 'layer_top' as any;
      const botId = 'layer_bot' as any;
      const viaPos = { x: 200, y: 100 };

      const seg1 = createTestTraceSegment({ pathId, layerId: topId, end: viaPos });
      const seg2 = createTestTraceSegment({ pathId, layerId: botId, start: viaPos });
      const via = createTestVia({ pathId, position: viaPos, fromLayerId: topId, toLayerId: botId });
      const path = createTestTracePath({ id: pathId, segments: [seg1, seg2], vias: [via] });

      expect(path.vias[0].position).toEqual(seg1.end);
      expect(path.vias[0].position).toEqual(seg2.start);
    });

    it('trace cornerRadius is preserved for rounded rendering', () => {
      const path = createTestTracePath({ cornerRadius: 15 });
      expect(path.cornerRadius).toBe(15);
    });

    it('trace fillPattern defaults to undefined (solid)', () => {
      const path = createTestTracePath();
      expect(path.fillPattern).toBeUndefined();
    });

    it('trace fillPattern can be set to any pattern', () => {
      const path = createTestTracePath({ fillPattern: FillPattern.CrossHatch });
      expect(path.fillPattern).toBe('cross_hatch');
    });
  });

  describe('Layer stack rendering data', () => {
    it('board layers are ordered for z-axis rendering', () => {
      const topSilk = createTestBoardLayer({ name: 'Top Silk', type: LayerType.SilkscreenTop, order: 0 });
      const topMask = createTestBoardLayer({ name: 'Top Mask', type: LayerType.SolderMaskTop, order: 1 });
      const topCopper = createTestBoardLayer({ name: 'Top Cu', type: LayerType.Signal, order: 2 });
      const botCopper = createTestBoardLayer({ name: 'Bot Cu', type: LayerType.Signal, order: 3 });
      const board = createTestBoard({ layers: [topSilk, topMask, topCopper, botCopper] });

      const orders = board.layers.map((l) => l.order);
      expect(orders).toEqual([0, 1, 2, 3]);
    });

    it('signal layers are identifiable for copper rendering', () => {
      const board = createTestBoard();
      const signalLayers = board.layers.filter((l) => l.type === LayerType.Signal);
      expect(signalLayers.length).toBeGreaterThanOrEqual(2);
    });

    it('layer visibility and opacity are preserved', () => {
      const layer = createTestBoardLayer({ visible: false, opacity: 0.5 });
      expect(layer.visible).toBe(false);
      expect(layer.opacity).toBe(0.5);
    });
  });

  describe('Via rendering data', () => {
    it('via has outer and drill diameters for ring rendering', () => {
      const via = createTestVia({ outerDiameter: 30, drillDiameter: 15 });
      expect(via.outerDiameter).toBe(30);
      expect(via.drillDiameter).toBe(15);
      expect(via.outerDiameter).toBeGreaterThan(via.drillDiameter);
    });

    it('via has from/to layer IDs for z-axis rendering', () => {
      const via = createTestVia({
        fromLayerId: 'layer_top' as any,
        toLayerId: 'layer_bot' as any,
      });
      expect(via.fromLayerId).toBe('layer_top');
      expect(via.toLayerId).toBe('layer_bot');
      expect(via.fromLayerId).not.toBe(via.toLayerId);
    });
  });

  describe('Edge connector / board outline data', () => {
    it('board workspace defines outline dimensions for edge rendering', () => {
      const board = createTestBoard();
      expect(board.workspace.width).toBeGreaterThan(0);
      expect(board.workspace.height).toBeGreaterThan(0);
    });

    it('board can have mechanical layers for edge connectors', () => {
      const mechLayer = createTestBoardLayer({ name: 'Mechanical', type: LayerType.Mechanical, order: 10 });
      const board = createTestBoard({ layers: [...createTestBoard().layers, mechLayer] });
      const mech = board.layers.find((l) => l.type === LayerType.Mechanical);
      expect(mech).toBeDefined();
    });
  });

  describe('Board profile rendering data', () => {
    it('profile with notches has correct vertex structure for polygon rendering', () => {
      const board = createTestBoard({
        profiles: [{
          kind: 'outline' as const,
          vertices: [
            { x: 0, y: 0, radius: 30 },
            { x: 340, y: 0, radius: 0 },
            { x: 340, y: 30, radius: 5 },
            { x: 380, y: 30, radius: 5 },
            { x: 380, y: 0, radius: 0 },
            { x: 5250, y: 0, radius: 30 },
            { x: 5250, y: 1180, radius: 30 },
            { x: 0, y: 1180, radius: 30 },
          ],
        }],
      });

      const profile = board.profiles![0];

      // Renderer needs: kind, vertices array with x, y, radius
      expect(profile.kind).toBe('outline');
      expect(profile.vertices.length).toBeGreaterThanOrEqual(3);

      // Every vertex must have x, y as numbers
      for (const v of profile.vertices) {
        expect(typeof v.x).toBe('number');
        expect(typeof v.y).toBe('number');
        expect(v.radius).toBeDefined();
      }

      // Notch vertices: the y=30 vertices create the notch indentation
      const notchUp = profile.vertices.filter((v) => v.y === 30);
      expect(notchUp.length).toBeGreaterThanOrEqual(2);

      // Fillet vertices should have radius > 0
      const filleted = profile.vertices.filter((v) => (v.radius ?? 0) > 0);
      expect(filleted.length).toBeGreaterThanOrEqual(4);
    });

    it('profile vertices form a closed polygon (last connects to first)', () => {
      const board = createTestBoard({
        profiles: [{
          kind: 'outline' as const,
          vertices: [
            { x: 0, y: 0, radius: 0 },
            { x: 100, y: 0, radius: 0 },
            { x: 100, y: 50, radius: 0 },
            { x: 0, y: 50, radius: 0 },
          ],
        }],
      });

      const verts = board.profiles![0].vertices;
      // The polygon is implicitly closed: last vertex connects to first
      // Renderer should draw: moveTo(v0) → lineTo(v1) → ... → lineTo(v0) → closePath
      expect(verts[0]).not.toEqual(verts[verts.length - 1]); // not explicitly closed
      expect(verts.length).toBe(4);
    });

    it('cutout profiles render as holes in the board', () => {
      const board = createTestBoard({
        profiles: [
          { kind: 'outline' as const, vertices: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 500 }, { x: 0, y: 500 }] },
          { kind: 'cutout' as const, vertices: [{ x: 400, y: 200 }, { x: 600, y: 200 }, { x: 600, y: 300 }, { x: 400, y: 300 }] },
        ],
      });

      expect(board.profiles!.length).toBe(2);
      expect(board.profiles![0].kind).toBe('outline');
      expect(board.profiles![1].kind).toBe('cutout');
      expect(board.profiles![1].vertices.length).toBe(4);
    });
  });
});
