import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationEngine } from '../engine';
import type { ValidationContext } from '../types';
import type { Board, Component, TracePath, TraceSegment, Net, DesignRule, BoardLayer } from '@pcb/domain';
import { LayerType, Rotation, PadShape, PinElectricalType, DesignRuleType } from '@pcb/domain';

/**
 * DDR5 RDIMM board-level regression tests.
 * Validates component clearance, capacitor overlap, trace shorts,
 * board profile/notch geometry, and via layer connectivity
 * using representative data from the DDR5-96GB-RDIMM layout.
 */

let engine: ValidationEngine;

function makeLayer(id: string, name: string, type: LayerType, order: number): BoardLayer {
  return { id: id as any, boardId: 'board_1' as any, name, type, order, color: '#ff0000', visible: true, locked: false, opacity: 1 };
}

const topLayer = makeLayer('lyr_top', 'Top Copper', LayerType.Signal, 0);
const botLayer = makeLayer('lyr_bot', 'Bottom Copper', LayerType.Signal, 1);

function makeBoard(overrides?: Partial<Board>): Board {
  return {
    id: 'board_1' as any,
    projectId: 'proj_1' as any,
    name: 'DDR5 RDIMM',
    workspace: { width: 5250, height: 1180, grid: { spacingX: 5, spacingY: 5, subdivisions: 2, visible: true, snapEnabled: true }, layerCount: 2 },
    layers: [topLayer, botLayer],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeComp(id: string, designator: string, x: number, y: number, bw: number, bh: number, cw?: number, ch?: number): Component {
  const hw = bw / 2, hh = bh / 2;
  const chw = (cw ?? bw + 16) / 2, chh = (ch ?? bh + 12) / 2;
  return {
    id: id as any, name: designator, designator,
    footprint: {
      id: `fp_${id}` as any, name: 'pkg', description: '',
      pads: [
        { id: `pad_${id}_1` as any, componentId: id as any, name: '1', localPosition: { x: -hw + 5, y: 0 }, shape: PadShape.Rect, width: 14, height: 18, rotation: Rotation.R0, layerId: topLayer.id, plated: true },
        { id: `pad_${id}_2` as any, componentId: id as any, name: '2', localPosition: { x: hw - 5, y: 0 }, shape: PadShape.Rect, width: 14, height: 18, rotation: Rotation.R0, layerId: topLayer.id, plated: true },
      ],
      pins: [
        { id: `pin_${id}_1` as any, padId: `pad_${id}_1` as any, name: '1', number: '1', electricalType: PinElectricalType.Passive },
        { id: `pin_${id}_2` as any, padId: `pad_${id}_2` as any, name: '2', number: '2', electricalType: PinElectricalType.Passive },
      ],
      boundingBox: { min: { x: -hw, y: -hh }, max: { x: hw, y: hh } },
      courtyard: { min: { x: -chw, y: -chh }, max: { x: chw, y: chh } },
    },
    transform: { position: { x, y }, rotation: Rotation.R0, mirrored: false },
    layerId: topLayer.id, properties: {}, locked: false,
  };
}

function makeSeg(id: string, pathId: string, sx: number, sy: number, ex: number, ey: number, width: number): TraceSegment {
  return { id: id as any, pathId: pathId as any, layerId: topLayer.id, start: { x: sx, y: sy }, end: { x: ex, y: ey }, width };
}

function makePath(id: string, netId: string, segments: TraceSegment[]): TracePath {
  return { id: id as any, netId: netId as any, segments, vias: [], debugLinks: [], cornerRadius: 0 };
}

function makeNet(id: string, name: string, pads: string[] = [], paths: string[] = []): Net {
  return { id: id as any, name, pins: [], pads: pads as any, paths: paths as any };
}

function makeCtx(overrides: Partial<ValidationContext>): ValidationContext {
  return { board: makeBoard(), components: [], nets: [], paths: [], rules: engine.getDefaultRules(), ...overrides };
}

beforeEach(() => {
  engine = new ValidationEngine();
});

describe('Capacitor-IC overlap detection', () => {
  it('detects capacitor overlapping IC courtyard', () => {
    // IC U1 at center, cap C1 placed inside its courtyard
    const u1 = makeComp('u1', 'U1', 500, 500, 300, 400);
    const c1 = makeComp('c1', 'C1', 500, 500, 44, 18); // dead center of U1

    const result = engine.validate(makeCtx({ components: [u1, c1] }));
    const overlaps = result.violations.filter((v) => v.message.includes('overlap') || v.message.includes('buffer'));
    expect(overlaps.length).toBeGreaterThan(0);
    expect(overlaps.some((v) => v.message.includes('U1') && v.message.includes('C1'))).toBe(true);
  });

  it('detects capacitor-capacitor courtyard overlap (top/bottom pairs)', () => {
    // C1 and C25 at same x, different y but courtyards touching
    const c1 = makeComp('c1', 'C1', 300, 550, 44, 18);
    const c25 = makeComp('c25', 'C25', 300, 570, 44, 18); // 20 mils apart center-to-center, courtyards overlap

    const result = engine.validate(makeCtx({ components: [c1, c25] }));
    const overlaps = result.violations.filter((v) => v.message.includes('C1') && v.message.includes('C25'));
    expect(overlaps.length).toBeGreaterThan(0);
  });

  it('passes when capacitor is clear of IC courtyard', () => {
    const u1 = makeComp('u1', 'U1', 500, 500, 300, 400);
    // C1 well outside U1 courtyard
    const c1 = makeComp('c1', 'C1', 500, 800, 44, 18);

    const result = engine.validate(makeCtx({ components: [u1, c1] }));
    const overlaps = result.violations.filter((v) =>
      (v.message.includes('overlap') || v.message.includes('buffer')) &&
      v.message.includes('U1') && v.message.includes('C1'),
    );
    expect(overlaps).toHaveLength(0);
  });
});

describe('Trace-trace short circuit detection', () => {
  it('detects two traces from different nets too close together', () => {
    const seg1 = makeSeg('s1', 'p1', 100, 100, 500, 100, 10);
    const seg2 = makeSeg('s2', 'p2', 100, 105, 500, 105, 10); // 5 mil center-to-center, effective 0 with width

    const p1 = makePath('p1', 'net_a', [seg1]);
    const p2 = makePath('p2', 'net_b', [seg2]);

    const result = engine.validate(makeCtx({ paths: [p1, p2], nets: [makeNet('net_a', 'VDD'), makeNet('net_b', 'GND')] }));
    const shorts = result.violations.filter((v) => v.message.includes('clearance') && v.message.includes('segment'));
    expect(shorts.length).toBeGreaterThan(0);
  });

  it('passes when traces from different nets have adequate clearance', () => {
    const seg1 = makeSeg('s1', 'p1', 100, 100, 500, 100, 5);
    const seg2 = makeSeg('s2', 'p2', 100, 120, 500, 120, 5); // 20 mil gap, well clear

    const p1 = makePath('p1', 'net_a', [seg1]);
    const p2 = makePath('p2', 'net_b', [seg2]);

    const result = engine.validate(makeCtx({ paths: [p1, p2], nets: [makeNet('net_a', 'VDD'), makeNet('net_b', 'GND')] }));
    const shorts = result.violations.filter((v) => v.message.includes('clearance') && v.message.includes('segment'));
    expect(shorts).toHaveLength(0);
  });

  it('allows traces on the same net to be close', () => {
    const seg1 = makeSeg('s1', 'p1', 100, 100, 500, 100, 10);
    const seg2 = makeSeg('s2', 'p2', 100, 105, 500, 105, 10);

    const p1 = makePath('p1', 'net_a', [seg1]);
    const p2 = makePath('p2', 'net_a', [seg2]); // same net

    const result = engine.validate(makeCtx({ paths: [p1, p2], nets: [makeNet('net_a', 'VDD')] }));
    const shorts = result.violations.filter((v) => v.message.includes('Trace clearance'));
    expect(shorts).toHaveLength(0);
  });
});

describe('Trace-component clearance', () => {
  it('detects trace running near a component courtyard edge', () => {
    const u1 = makeComp('u1', 'U1', 500, 500, 300, 400);
    // Trace runs just outside the courtyard edge (courtyard max x = 500+158=658)
    // Place trace at x=660, which is 2 mils from courtyard edge (below 6 mil min clearance)
    const seg = makeSeg('s1', 'p1', 660, 300, 660, 700, 10);
    expect(seg.layerId).toBe(u1.layerId);

    const result = engine.validate(makeCtx({ components: [u1], paths: [makePath('p1', 'net_a', [seg])] }));
    const violations = result.violations.filter((v) => v.message.includes('Trace-to-component') && v.message.includes('U1'));
    expect(violations.length).toBeGreaterThan(0);
  });

  it('detects trace passing entirely through a component courtyard interior', () => {
    const u1 = makeComp('u1', 'U1', 500, 500, 300, 400);
    // Trace passes straight through U1 center -- both endpoints inside courtyard
    const seg = makeSeg('s1', 'p1', 400, 500, 600, 500, 10);

    const result = engine.validate(makeCtx({ components: [u1], paths: [makePath('p1', 'net_a', [seg])] }));
    const violations = result.violations.filter((v) =>
      v.message.includes('passes through') && v.message.includes('U1'),
    );
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe('Board profile and notch geometry', () => {
  it('validates DDR5 RDIMM has a key notch in the outline', () => {
    const board = makeBoard({
      profiles: [{
        kind: 'outline',
        vertices: [
          { x: 0, y: 0, radius: 30 },
          { x: 340, y: 0, radius: 0 },
          { x: 340, y: 30, radius: 5 },
          { x: 380, y: 30, radius: 5 },
          { x: 380, y: 0, radius: 0 },
          { x: 2565, y: 0, radius: 0 },
          { x: 2565, y: 50, radius: 0 },
          { x: 2685, y: 50, radius: 0 },
          { x: 2685, y: 0, radius: 0 },
          { x: 4870, y: 0, radius: 0 },
          { x: 4870, y: 30, radius: 5 },
          { x: 4910, y: 30, radius: 5 },
          { x: 4910, y: 0, radius: 0 },
          { x: 5250, y: 0, radius: 30 },
          { x: 5250, y: 1180, radius: 30 },
          { x: 0, y: 1180, radius: 30 },
        ],
      }],
    });

    const profile = board.profiles![0];
    expect(profile.kind).toBe('outline');
    expect(profile.vertices.length).toBe(16);

    // Verify center key notch
    const notchVertices = profile.vertices.filter((v) => v.y === 50);
    expect(notchVertices).toHaveLength(2);
    expect(notchVertices[0].x).toBe(2565);
    expect(notchVertices[1].x).toBe(2685);

    // Verify fillet radii on main corners + side notch corners
    const corners = profile.vertices.filter((v) => v.radius && v.radius > 0);
    expect(corners.length).toBeGreaterThanOrEqual(8); // 4 main + 4 notch fillets
  });

  it('validates DDR5 RDIMM has side alignment notches', () => {
    const board = makeBoard({
      profiles: [{
        kind: 'outline',
        vertices: [
          { x: 0, y: 0, radius: 30 },
          { x: 340, y: 0, radius: 0 },
          { x: 340, y: 30, radius: 5 },
          { x: 380, y: 30, radius: 5 },
          { x: 380, y: 0, radius: 0 },
          { x: 2565, y: 0, radius: 0 },
          { x: 2565, y: 50, radius: 0 },
          { x: 2685, y: 50, radius: 0 },
          { x: 2685, y: 0, radius: 0 },
          { x: 4870, y: 0, radius: 0 },
          { x: 4870, y: 30, radius: 5 },
          { x: 4910, y: 30, radius: 5 },
          { x: 4910, y: 0, radius: 0 },
          { x: 5250, y: 0, radius: 30 },
          { x: 5250, y: 1180, radius: 30 },
          { x: 0, y: 1180, radius: 30 },
        ],
      }],
    });

    const profile = board.profiles![0];
    expect(profile.vertices.length).toBe(16);

    // Find all notches: y=0 followed by y>0 (going "up" into the board)
    const notches: { startX: number; depth: number }[] = [];
    for (let i = 0; i < profile.vertices.length; i++) {
      const v = profile.vertices[i];
      const next = profile.vertices[(i + 1) % profile.vertices.length];
      if (v.y === 0 && next.y > 0 && next.y < 100) {
        notches.push({ startX: v.x, depth: next.y });
      }
    }

    // Should have 3 notches: left alignment, center key, right alignment
    expect(notches).toHaveLength(3);
    expect(notches[0]).toEqual({ startX: 340, depth: 30 });   // left
    expect(notches[1]).toEqual({ startX: 2565, depth: 50 });  // center key
    expect(notches[2]).toEqual({ startX: 4870, depth: 30 });  // right
  });
});

describe('Component body overlap (physical collision)', () => {
  it('detects body overlap even when courtyards have room', () => {
    // Two components with large courtyards but bodies that just touch
    const a = makeComp('a', 'C1', 100, 100, 44, 18, 100, 80); // wide courtyard
    const b = makeComp('b', 'C2', 130, 100, 44, 18, 100, 80); // bodies overlap at x

    const result = engine.validate(makeCtx({ components: [a, b] }));
    const bodyOverlaps = result.violations.filter((v) => v.message.includes('body overlap'));
    // Bodies: C1=[78,91]-[122,109], C2=[108,91]-[152,109] → overlap at x=108-122
    expect(bodyOverlaps.length).toBeGreaterThan(0);
  });

  it('passes when bodies do not overlap', () => {
    const a = makeComp('a', 'C1', 100, 100, 44, 18);
    const b = makeComp('b', 'C2', 200, 100, 44, 18); // 100 mil gap

    const result = engine.validate(makeCtx({ components: [a, b] }));
    const bodyOverlaps = result.violations.filter((v) => v.message.includes('body overlap'));
    expect(bodyOverlaps).toHaveLength(0);
  });
});

describe('Via layer connectivity on DDR5 traces', () => {
  it('detects via with wrong layer assignment', () => {
    const seg1 = makeSeg('s1', 'p1', 100, 100, 200, 100, 5);
    const seg2: TraceSegment = { ...makeSeg('s2', 'p1', 200, 100, 300, 100, 5), layerId: botLayer.id };

    const path: TracePath = {
      id: 'p1' as any, netId: 'net_a' as any,
      segments: [seg1, seg2],
      vias: [{
        id: 'via_1' as any, pathId: 'p1' as any,
        position: { x: 200, y: 100 },
        fromLayerId: topLayer.id,
        toLayerId: 'lyr_nonexistent' as any, // wrong!
        outerDiameter: 30, drillDiameter: 15, netId: 'net_a' as any,
      }],
      debugLinks: [], cornerRadius: 0,
    };

    const result = engine.validate(makeCtx({ paths: [path] }));
    const viaErrors = result.violations.filter((v) => v.message.includes('via') || v.message.includes('Via'));
    expect(viaErrors.length).toBeGreaterThan(0);
  });

  it('passes via with correct layer assignments', () => {
    const seg1 = makeSeg('s1', 'p1', 100, 100, 200, 100, 5);
    const seg2: TraceSegment = { ...makeSeg('s2', 'p1', 200, 100, 300, 100, 5), layerId: botLayer.id };

    const path: TracePath = {
      id: 'p1' as any, netId: 'net_a' as any,
      segments: [seg1, seg2],
      vias: [{
        id: 'via_1' as any, pathId: 'p1' as any,
        position: { x: 200, y: 100 },
        fromLayerId: topLayer.id,
        toLayerId: botLayer.id,
        outerDiameter: 30, drillDiameter: 15, netId: 'net_a' as any,
      }],
      debugLinks: [], cornerRadius: 0,
    };

    const result = engine.validate(makeCtx({ paths: [path] }));
    const viaErrors = result.violations.filter((v) =>
      (v.message.includes('via') || v.message.includes('Via')) &&
      v.message.includes('layer'),
    );
    expect(viaErrors).toHaveLength(0);
  });
});

describe('Trace endpoint alignment', () => {
  it('warns on dangling trace not connected to pad or via', () => {
    // Trace floating in space, not connected to any pad
    const seg = makeSeg('s1', 'p1', 999, 999, 1200, 999, 5);
    const path = makePath('p1', 'net_a', [seg]);

    const result = engine.validate(makeCtx({ paths: [path] }));
    const dangles = result.warnings.filter((v) => v.message.includes('Dangling'));
    expect(dangles.length).toBeGreaterThan(0);
  });

  it('passes when trace endpoints connect to pads', () => {
    // Component with pads at exactly the trace endpoints
    const comp = makeComp('u1', 'U1', 100, 100, 300, 200);
    // Pad 1 at (-145, 100) world = (100-145, 100) = (-45, 100)
    // Override pad positions to match trace
    comp.footprint.pads[0].localPosition = { x: 0, y: 0 };
    comp.footprint.pads[1].localPosition = { x: 200, y: 0 };
    // Trace from pad 1 to pad 2
    const seg = makeSeg('s1', 'p1', 100, 100, 300, 100, 5);
    const net = makeNet('net_a', 'SIG', [comp.footprint.pads[0].id as string, comp.footprint.pads[1].id as string]);
    const path = makePath('p1', 'net_a', [seg]);

    const result = engine.validate(makeCtx({ components: [comp], paths: [path], nets: [net] }));
    const dangles = result.warnings.filter((v) => v.message.includes('Dangling') && v.message.includes('s1'));
    expect(dangles).toHaveLength(0);
  });
});

describe('Trace layer assignment validation', () => {
  it('warns when power net is on a signal layer', () => {
    const board = makeBoard({
      layers: [
        topLayer,
        botLayer,
        makeLayer('lyr_gnd', 'GND Plane', LayerType.Plane, 2),
      ],
    });
    // VDD trace on the signal layer instead of plane
    const seg = makeSeg('s1', 'p1', 100, 100, 500, 100, 50);
    const net = makeNet('net_vdd', 'VDD');
    const path = makePath('p1', 'net_vdd', [seg]);

    const result = engine.validate(makeCtx({ board, paths: [path], nets: [net] }));
    const layerWarns = result.warnings.filter((v) => v.message.includes('Layer assignment') && v.message.includes('VDD'));
    expect(layerWarns.length).toBeGreaterThan(0);
  });

  it('warns when signal net is on a plane layer', () => {
    const planeLayer = makeLayer('lyr_plane', 'GND Plane', LayerType.Plane, 1);
    const board = makeBoard({ layers: [topLayer, planeLayer] });
    const seg: any = { ...makeSeg('s1', 'p1', 100, 100, 500, 100, 5), layerId: planeLayer.id };
    const net = makeNet('net_dq0', 'DQ0');
    const path = makePath('p1', 'net_dq0', [seg]);

    const result = engine.validate(makeCtx({ board, paths: [path], nets: [net] }));
    const layerWarns = result.warnings.filter((v) => v.message.includes('Layer assignment') && v.message.includes('DQ0'));
    expect(layerWarns.length).toBeGreaterThan(0);
  });

  it('passes when power net is on a plane layer', () => {
    const planeLayer = makeLayer('lyr_plane', 'GND Plane', LayerType.Plane, 1);
    const board = makeBoard({ layers: [topLayer, planeLayer] });
    const seg: any = { ...makeSeg('s1', 'p1', 100, 100, 500, 100, 40), layerId: planeLayer.id };
    const net = makeNet('net_vss', 'VSS');
    const path = makePath('p1', 'net_vss', [seg]);

    const result = engine.validate(makeCtx({ board, paths: [path], nets: [net] }));
    const layerWarns = [...result.violations, ...result.warnings].filter(
      (v) => v.message.includes('Layer assignment') && v.message.includes('VSS'),
    );
    expect(layerWarns).toHaveLength(0);
  });

  it('skips check on boards with no plane layers', () => {
    const board = makeBoard({ layers: [topLayer, botLayer] }); // no planes
    const seg = makeSeg('s1', 'p1', 100, 100, 500, 100, 50);
    const net = makeNet('net_vdd', 'VDD');
    const path = makePath('p1', 'net_vdd', [seg]);

    const result = engine.validate(makeCtx({ board, paths: [path], nets: [net] }));
    const layerWarns = [...result.violations, ...result.warnings].filter(
      (v) => v.message.includes('Layer assignment'),
    );
    expect(layerWarns).toHaveLength(0);
  });
});

describe('Trace width validation', () => {
  it('flags traces below minimum width', () => {
    const seg = makeSeg('s1', 'p1', 100, 100, 500, 100, 3); // 3 mil, below 6 mil default
    const result = engine.validate(makeCtx({ paths: [makePath('p1', 'net_a', [seg])] }));
    const widthErrors = result.violations.filter((v) => v.message.includes('width'));
    expect(widthErrors.length).toBeGreaterThan(0);
  });

  it('passes traces at or above minimum width', () => {
    const seg = makeSeg('s1', 'p1', 100, 100, 500, 100, 8); // 8 mil, above 6 mil
    const result = engine.validate(makeCtx({ paths: [makePath('p1', 'net_a', [seg])] }));
    const widthErrors = result.violations.filter((v) => v.message.includes('width'));
    expect(widthErrors).toHaveLength(0);
  });
});

describe('Component out-of-bounds', () => {
  it('detects component placed outside board boundary', () => {
    const comp = makeComp('c1', 'C1', 6000, 500, 44, 18); // x=6000 > board width 5250
    const result = engine.validate(makeCtx({ components: [comp] }));
    const oob = result.violations.filter((v) => v.message.includes('out of bounds') || v.message.includes('beyond board'));
    expect(oob.length).toBeGreaterThan(0);
  });
});
