import type { DesignRuleViolation } from '@pcb/domain';
import { DesignRuleType, LayerType } from '@pcb/domain';
import type { RuleChecker, ValidationContext } from '../types';
import { transformBoundingBox, boundingBoxOverlap } from '../utils';

/**
 * Checks that all components are within board bounds.
 */
export const componentWithinBoundsChecker: RuleChecker = {
  name: 'component-within-bounds',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const boardW = ctx.board.workspace.width;
    const boardH = ctx.board.workspace.height;

    for (const comp of ctx.components) {
      const box = transformBoundingBox(comp.footprint.boundingBox, comp.transform);

      if (box.min.x < 0 || box.min.y < 0 || box.max.x > boardW || box.max.y > boardH) {
        violations.push({
          ruleId: '' as any,
          entityIds: [comp.id],
          message: `Component out of bounds: ${comp.designator} extends beyond board boundary`,
          severity: 'error',
          location: { x: comp.transform.position.x, y: comp.transform.position.y },
        });
      }
    }

    return violations;
  },
};

/**
 * Checks for component overlap using courtyard bounding boxes.
 */
export const componentOverlapChecker: RuleChecker = {
  name: 'component-overlap',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const comps = ctx.components;

    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const a = comps[i];
        const b = comps[j];

        // Components on different sides of the board can overlap
        if (a.layerId !== b.layerId) continue;

        const boxA = transformBoundingBox(a.footprint.courtyard, a.transform);
        const boxB = transformBoundingBox(b.footprint.courtyard, b.transform);

        if (boundingBoxOverlap(boxA, boxB)) {
          const midX = (a.transform.position.x + b.transform.position.x) / 2;
          const midY = (a.transform.position.y + b.transform.position.y) / 2;
          violations.push({
            ruleId: '' as any,
            entityIds: [a.id, b.id],
            message: `Component overlap: ${a.designator} and ${b.designator} courtyards overlap`,
            severity: 'error',
            location: { x: midX, y: midY },
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Checks that components are placed on valid signal layers (top or bottom copper).
 */
export const componentOnValidLayerChecker: RuleChecker = {
  name: 'component-on-valid-layer',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const validLayerIds = new Set(
      ctx.board.layers
        .filter((l) => l.type === LayerType.Signal)
        .map((l) => l.id),
    );

    for (const comp of ctx.components) {
      if (!validLayerIds.has(comp.layerId)) {
        violations.push({
          ruleId: '' as any,
          entityIds: [comp.id],
          message: `Invalid layer: ${comp.designator} is placed on a non-signal layer (${comp.layerId})`,
          severity: 'error',
          location: { x: comp.transform.position.x, y: comp.transform.position.y },
        });
      }
    }

    return violations;
  },
};

/**
 * Checks that all pads are assigned to a net.
 * Pads that are not assigned to any net may indicate incomplete schematic capture.
 */
export const padNetAssignmentChecker: RuleChecker = {
  name: 'pad-net-assignment',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    // Collect all pad IDs assigned to any net
    const assignedPads = new Set<string>();
    for (const net of ctx.nets) {
      for (const padId of net.pads) {
        assignedPads.add(padId);
      }
    }

    for (const comp of ctx.components) {
      for (const pad of comp.footprint.pads) {
        if (!assignedPads.has(pad.id)) {
          // Check if there's a matching pin marked as unconnected
          const pin = comp.footprint.pins.find((p) => p.padId === pad.id);
          if (pin && pin.electricalType === 'unconnected') continue;

          violations.push({
            ruleId: '' as any,
            entityIds: [pad.id, comp.id],
            message: `Unassigned pad: ${comp.designator} pad ${pad.name} is not assigned to any net`,
            severity: 'warning',
            location: { x: comp.transform.position.x, y: comp.transform.position.y },
          });
        }
      }
    }

    return violations;
  },
};
