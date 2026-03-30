import { describe, it, expect } from 'vitest';
import { ValidationEngine } from '../engine';
import type { RuleChecker, ValidationContext } from '../types';
import {
  createTestBoard,
  createTestComponent,
  createTestNet,
  createTestTracePath,
  createTestTraceSegment,
  createTestDesignRule,
  createTestBoardLayer,
} from '../../../domain/src/__tests__/fixtures';
import { DesignRuleType, Rotation, LayerType } from '@pcb/domain';
import type { DesignRuleViolation, DesignRuleId } from '@pcb/domain';

function makeContext(overrides?: Partial<ValidationContext>): ValidationContext {
  const board = createTestBoard();
  return {
    board,
    components: [],
    nets: [],
    paths: [],
    rules: [],
    ...overrides,
  };
}

describe('ValidationEngine', () => {
  it('runs all registered rules', () => {
    const engine = new ValidationEngine();

    const callLog: string[] = [];
    const customRule: RuleChecker = {
      name: 'test-rule',
      check(_ctx) {
        callLog.push('checked');
        return [];
      },
    };

    engine.registerRule(customRule);
    engine.validate(makeContext());

    expect(callLog).toContain('checked');
  });

  it('returns violations and warnings correctly', () => {
    const engine = new ValidationEngine();

    const ruleWithViolation: RuleChecker = {
      name: 'violation-rule',
      check(_ctx): DesignRuleViolation[] {
        return [
          {
            ruleId: 'test' as DesignRuleId,
            entityIds: ['e1'],
            message: 'A violation',
            severity: 'error',
          },
          {
            ruleId: 'test' as DesignRuleId,
            entityIds: ['e2'],
            message: 'A warning',
            severity: 'warning',
          },
        ];
      },
    };

    engine.registerRule(ruleWithViolation);
    const result = engine.validate(makeContext());

    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].message).toBe('A violation');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toBe('A warning');
  });

  it('valid board with no components produces no violations from component rules', () => {
    const engine = new ValidationEngine();
    const result = engine.validate(makeContext());

    // With no components, nets, or paths, no rules should flag anything
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('board with overlapping components produces violation', () => {
    const engine = new ValidationEngine();

    const layer = createTestBoardLayer({ name: 'Top', type: LayerType.Signal });
    const board = createTestBoard({ layers: [layer] });

    const comp1 = createTestComponent({
      designator: 'R1',
      layerId: layer.id,
      transform: { position: { x: 500, y: 500 }, rotation: Rotation.R0, mirrored: false },
    });
    const comp2 = createTestComponent({
      designator: 'R2',
      layerId: layer.id,
      transform: { position: { x: 510, y: 500 }, rotation: Rotation.R0, mirrored: false },
    });

    const result = engine.validate(
      makeContext({ board, components: [comp1, comp2] }),
    );

    const overlapViolations = result.violations.filter((v) =>
      v.message.includes('overlap'),
    );
    expect(overlapViolations.length).toBeGreaterThan(0);
  });

  it('board with trace below min width produces violation', () => {
    const engine = new ValidationEngine();

    const minWidthRule = createTestDesignRule({
      type: DesignRuleType.MinTraceWidth,
      value: 10,
      enabled: true,
    });

    const thinSegment = createTestTraceSegment({ width: 4 });
    const path = createTestTracePath({
      segments: [thinSegment],
    });

    const result = engine.validate(
      makeContext({ paths: [path], rules: [minWidthRule] }),
    );

    const widthViolations = result.violations.filter((v) =>
      v.message.toLowerCase().includes('trace width'),
    );
    expect(widthViolations.length).toBeGreaterThan(0);
  });

  it('getDefaultRules returns expected number of rules', () => {
    const engine = new ValidationEngine();
    const rules = engine.getDefaultRules();

    expect(rules.length).toBe(6);

    const types = rules.map((r) => r.type);
    expect(types).toContain(DesignRuleType.MinTraceWidth);
    expect(types).toContain(DesignRuleType.MinClearance);
    expect(types).toContain(DesignRuleType.MinDrillSize);
    expect(types).toContain(DesignRuleType.MinAnnularRing);
    expect(types).toContain(DesignRuleType.TraceToEdge);
    expect(types).toContain(DesignRuleType.ComponentToEdge);

    // All should be enabled by default
    expect(rules.every((r) => r.enabled)).toBe(true);
  });
});
