import { describe, it, expect, beforeEach } from 'vitest';
import { icWithinBoardEdgeChecker } from '../rules/component-rules';
import type { ValidationContext } from '../types';
import {
  createTestBoard,
  createTestComponent,
  createTestBoardLayer,
  resetIdCounter,
} from '../../../domain/src/__tests__/fixtures';
import { Rotation, LayerType } from '@pcb/domain';
import type { LayerId } from '@pcb/domain';

function makeCtx(overrides?: Partial<ValidationContext>): ValidationContext {
  return {
    board: createTestBoard(),
    components: [],
    nets: [],
    paths: [],
    rules: [],
    ...overrides,
  };
}

describe('icWithinBoardEdgeChecker', () => {
  beforeEach(() => resetIdCounter());

  it('passes when IC is fully inside the board', () => {
    const board = createTestBoard(); // 5000 x 4000
    const ic = createTestComponent({
      designator: 'U1',
      name: 'IC',
      transform: { position: { x: 2500, y: 2000 }, rotation: Rotation.R0, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -200, y: -200 }, max: { x: 200, y: 200 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    expect(violations).toHaveLength(0);
  });

  it('flags IC that extends past the right edge', () => {
    const board = createTestBoard(); // 5000 x 4000
    const ic = createTestComponent({
      designator: 'U1',
      name: 'IC',
      transform: { position: { x: 4900, y: 2000 }, rotation: Rotation.R0, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -200, y: -200 }, max: { x: 200, y: 200 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('U1');
    expect(violations[0].message).toContain('right');
    expect(violations[0].severity).toBe('error');
  });

  it('flags IC that extends past the top edge', () => {
    const board = createTestBoard(); // 5000 x 4000
    const ic = createTestComponent({
      designator: 'U2',
      name: 'IC',
      transform: { position: { x: 2500, y: 3900 }, rotation: Rotation.R0, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -100, y: -150 }, max: { x: 100, y: 150 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('U2');
    expect(violations[0].message).toContain('top');
  });

  it('flags IC that extends past the left edge (negative x)', () => {
    const board = createTestBoard();
    const ic = createTestComponent({
      designator: 'U3',
      name: 'IC',
      transform: { position: { x: 50, y: 2000 }, rotation: Rotation.R0, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -200, y: -200 }, max: { x: 200, y: 200 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('left');
  });

  it('flags IC extending past multiple edges', () => {
    const board = createTestBoard();
    const ic = createTestComponent({
      designator: 'U4',
      name: 'IC',
      // Placed at corner, extends past both right and top
      transform: { position: { x: 4950, y: 3950 }, rotation: Rotation.R0, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -100, y: -100 }, max: { x: 100, y: 100 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('right');
    expect(violations[0].message).toContain('top');
  });

  it('does NOT flag connectors that extend past the edge', () => {
    const board = createTestBoard();
    const connector = createTestComponent({
      designator: 'J1',
      name: 'Edge Connector',
      // Connector hanging off the bottom edge — this is normal
      transform: { position: { x: 2500, y: 10 }, rotation: Rotation.R0, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -500, y: -50 }, max: { x: 500, y: 50 } },
      },
    });

    const ctx = makeCtx({ board, components: [connector] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    expect(violations).toHaveLength(0);
  });

  it('does NOT flag passives (R, C, L) that extend past the edge', () => {
    const board = createTestBoard();
    const resistor = createTestComponent({
      designator: 'R1',
      name: 'Resistor',
      transform: { position: { x: 4990, y: 2000 }, rotation: Rotation.R0, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -30, y: -20 }, max: { x: 30, y: 20 } },
      },
    });

    const ctx = makeCtx({ board, components: [resistor] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    expect(violations).toHaveLength(0);
  });

  it('accounts for rotation when checking bounds', () => {
    const board = createTestBoard(); // 5000 x 4000
    // A wide IC placed near the right edge — fits when horizontal,
    // but after 90° rotation its width becomes height and vice versa
    const ic = createTestComponent({
      designator: 'U5',
      name: 'IC',
      transform: { position: { x: 4800, y: 2000 }, rotation: Rotation.R90, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        // Wide and short: 400x100
        courtyard: { min: { x: -200, y: -50 }, max: { x: 200, y: 50 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    // After 90° rotation, 400-wide becomes 400-tall: courtyard x = ±50, y = ±200
    // At x=4800: max_x = 4800+50 = 4850 < 5000 → OK
    expect(violations).toHaveLength(0);
  });

  it('flags rotated IC that overhangs after rotation', () => {
    const board = createTestBoard(); // 5000 x 4000
    const ic = createTestComponent({
      designator: 'U6',
      name: 'IC',
      transform: { position: { x: 4980, y: 2000 }, rotation: Rotation.R90, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -200, y: -50 }, max: { x: 200, y: 50 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    // After 90° rotation at x=4980: max_x = 4980+50=5030 > 5000
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('right');
  });

  it('flags IC that overlaps a board cutout notch', () => {
    const board = createTestBoard();
    // Add a side retention clip cutout
    (board as any).profiles = [
      { kind: 'outline', vertices: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 4000 }, { x: 0, y: 4000 }] },
      { kind: 'cutout', vertices: [{ x: 0, y: 1800 }, { x: 30, y: 1800 }, { x: 30, y: 2200 }, { x: 0, y: 2200 }] },
    ];

    const ic = createTestComponent({
      designator: 'U10',
      name: 'IC',
      // IC placed at left edge, courtyard overlaps the cutout at x=0-30, y=1800-2200
      transform: { position: { x: 100, y: 2000 }, rotation: Rotation.R0, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -120, y: -150 }, max: { x: 120, y: 150 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    const cutoutViolations = violations.filter((v) => v.message.includes('cutout'));
    expect(cutoutViolations.length).toBeGreaterThan(0);
    expect(cutoutViolations[0].message).toContain('U10');
  });

  it('passes when IC is clear of all cutout notches', () => {
    const board = createTestBoard();
    (board as any).profiles = [
      { kind: 'outline', vertices: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 4000 }, { x: 0, y: 4000 }] },
      { kind: 'cutout', vertices: [{ x: 0, y: 400 }, { x: 30, y: 400 }, { x: 30, y: 460 }, { x: 0, y: 460 }] },
    ];

    const ic = createTestComponent({
      designator: 'U11',
      name: 'IC',
      // IC far from the cutout
      transform: { position: { x: 2500, y: 2000 }, rotation: Rotation.R0, mirrored: false },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -200, y: -200 }, max: { x: 200, y: 200 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    const cutoutViolations = violations.filter((v) => v.message.includes('cutout'));
    expect(cutoutViolations).toHaveLength(0);
  });

  it('handles mirrored (bottom-side) ICs correctly', () => {
    const board = createTestBoard();
    const ic = createTestComponent({
      designator: 'U7',
      name: 'IC',
      // Mirrored at the left edge
      transform: { position: { x: 100, y: 2000 }, rotation: Rotation.R0, mirrored: true },
      footprint: {
        ...createTestComponent().footprint,
        courtyard: { min: { x: -200, y: -200 }, max: { x: 200, y: 200 } },
      },
    });

    const ctx = makeCtx({ board, components: [ic] });
    const violations = icWithinBoardEdgeChecker.check(ctx);
    // Mirrored flips X: courtyard becomes -200..200 mirrored to -200..200 (symmetric)
    // At x=100: min_x = 100-200 = -100 < 0
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('left');
  });
});
