import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationEngine } from '../engine';
import type { ValidationContext } from '../types';
import {
  createTestBoard,
  createTestBoardLayer,
  createTestTracePath,
  createTestTraceSegment,
  createTestVia,
  resetIdCounter,
} from '../../../../packages/domain/src/__tests__/fixtures';
import { LayerType } from '@pcb/domain';

describe('via-layer-connectivity checker', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    resetIdCounter();
    engine = new ValidationEngine();
  });

  function makeCtx(overrides: Partial<ValidationContext>): ValidationContext {
    return {
      board: createTestBoard(),
      components: [],
      nets: [],
      paths: [],
      rules: engine.getDefaultRules(),
      ...overrides,
    };
  }

  it('passes when via layers match adjacent segment layers', () => {
    const topLayer = createTestBoardLayer({ name: 'Top', type: LayerType.Signal, order: 0 });
    const bottomLayer = createTestBoardLayer({ name: 'Bottom', type: LayerType.Signal, order: 1 });
    const board = createTestBoard({ layers: [topLayer, bottomLayer] });

    const pathId = 'trace_1' as any;
    const viaPos = { x: 200, y: 100 };

    const seg1 = createTestTraceSegment({
      pathId,
      layerId: topLayer.id,
      start: { x: 100, y: 100 },
      end: viaPos,
    });
    const seg2 = createTestTraceSegment({
      pathId,
      layerId: bottomLayer.id,
      start: viaPos,
      end: { x: 300, y: 100 },
    });
    const via = createTestVia({
      pathId,
      position: viaPos,
      fromLayerId: topLayer.id,
      toLayerId: bottomLayer.id,
    });

    const path = createTestTracePath({
      id: pathId,
      segments: [seg1, seg2],
      vias: [via],
    });

    const result = engine.validate(makeCtx({ board, paths: [path] }));
    const viaViolations = result.violations.filter((v) => v.message.includes('via'));
    expect(viaViolations).toHaveLength(0);
  });

  it('fails when via fromLayer does not match any touching segment', () => {
    const topLayer = createTestBoardLayer({ name: 'Top', type: LayerType.Signal, order: 0 });
    const bottomLayer = createTestBoardLayer({ name: 'Bottom', type: LayerType.Signal, order: 1 });
    const wrongLayer = createTestBoardLayer({ name: 'Inner', type: LayerType.Signal, order: 2 });
    const board = createTestBoard({ layers: [topLayer, bottomLayer, wrongLayer] });

    const pathId = 'trace_2' as any;
    const viaPos = { x: 200, y: 100 };

    const seg1 = createTestTraceSegment({
      pathId,
      layerId: topLayer.id,
      start: { x: 100, y: 100 },
      end: viaPos,
    });
    const seg2 = createTestTraceSegment({
      pathId,
      layerId: bottomLayer.id,
      start: viaPos,
      end: { x: 300, y: 100 },
    });
    // Via claims to go from wrongLayer to bottomLayer, but no segment is on wrongLayer
    const via = createTestVia({
      pathId,
      position: viaPos,
      fromLayerId: wrongLayer.id,
      toLayerId: bottomLayer.id,
    });

    const path = createTestTracePath({
      id: pathId,
      segments: [seg1, seg2],
      vias: [via],
    });

    const result = engine.validate(makeCtx({ board, paths: [path] }));
    const viaViolations = result.violations.filter((v) => v.message.includes('source layer mismatch'));
    expect(viaViolations.length).toBeGreaterThanOrEqual(1);
  });

  it('flags orphan vias with no touching segments', () => {
    const topLayer = createTestBoardLayer({ name: 'Top', type: LayerType.Signal, order: 0 });
    const board = createTestBoard({ layers: [topLayer] });

    const pathId = 'trace_3' as any;
    const seg = createTestTraceSegment({
      pathId,
      layerId: topLayer.id,
      start: { x: 100, y: 100 },
      end: { x: 200, y: 100 },
    });
    // Via at a completely different position
    const via = createTestVia({
      pathId,
      position: { x: 999, y: 999 },
      fromLayerId: topLayer.id,
      toLayerId: topLayer.id,
    });

    const path = createTestTracePath({
      id: pathId,
      segments: [seg],
      vias: [via],
    });

    const result = engine.validate(makeCtx({ board, paths: [path] }));
    const orphanViolations = result.violations.filter((v) => v.message.includes('Orphan via'));
    expect(orphanViolations.length).toBeGreaterThanOrEqual(1);
  });
});
