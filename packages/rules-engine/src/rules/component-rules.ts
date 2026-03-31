import type { DesignRuleViolation } from '@pcb/domain';
import { DesignRuleType, LayerType } from '@pcb/domain';
import type { RuleChecker, ValidationContext } from '../types';
import { transformBoundingBox, boundingBoxOverlap, boundingBoxDistance } from '../utils';

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
 * Minimum buffer between component courtyards in mils.
 * Even when no MinClearance design rule exists, components must not overlap
 * and should maintain at least this buffer.
 */
const DEFAULT_COMPONENT_BUFFER = 5; // mils

/**
 * Checks for component overlap and enforces a minimum buffer between courtyards.
 * Uses the MinClearance design rule value if available, otherwise falls back
 * to DEFAULT_COMPONENT_BUFFER.
 */
export const componentOverlapChecker: RuleChecker = {
  name: 'component-overlap',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const comps = ctx.components;

    const clearanceRule = ctx.rules.find(
      (r) => r.type === DesignRuleType.MinClearance && r.enabled,
    );
    const buffer = clearanceRule ? clearanceRule.value : DEFAULT_COMPONENT_BUFFER;

    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const a = comps[i];
        const b = comps[j];

        // Components on different sides of the board can overlap
        if (a.layerId !== b.layerId) continue;

        const boxA = transformBoundingBox(a.footprint.courtyard, a.transform);
        const boxB = transformBoundingBox(b.footprint.courtyard, b.transform);

        const dist = boundingBoxDistance(boxA, boxB);

        if (dist < buffer) {
          const midX = (a.transform.position.x + b.transform.position.x) / 2;
          const midY = (a.transform.position.y + b.transform.position.y) / 2;
          const severity = dist <= 0 ? 'error' : 'warning';
          const label = dist <= 0
            ? `Component overlap: ${a.designator} and ${b.designator} courtyards overlap`
            : `Component buffer violation: ${a.designator} and ${b.designator} are ${dist.toFixed(1)} mils apart (minimum ${buffer} mils)`;
          violations.push({
            ruleId: clearanceRule?.id ?? ('' as any),
            entityIds: [a.id, b.id],
            message: label,
            severity,
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
 * Designator prefixes for IC-type components that must not extend past the
 * board edge.  Connectors (J, P) are exempt because they often overhang the
 * edge by design (e.g. edge-finger connectors, pin headers).
 */
const IC_PREFIXES = new Set(['U', 'IC']);

/**
 * Checks that IC components (designator prefix U or IC) do not extend
 * past the board edge using courtyard bounds.
 * Also checks that IC courtyards do not overlap with board cutout profiles
 * (retention clip notches, mounting slots, etc.).
 * Connectors, passives, and other component types are exempt.
 */
export const icWithinBoardEdgeChecker: RuleChecker = {
  name: 'ic-within-board-edge',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const boardW = ctx.board.workspace.width;
    const boardH = ctx.board.workspace.height;

    // Collect cutout bounding boxes from board profiles
    const cutoutBoxes: { min: { x: number; y: number }; max: { x: number; y: number } }[] = [];
    const profiles = (ctx.board as any).profiles;
    if (profiles && Array.isArray(profiles)) {
      for (const profile of profiles) {
        if (profile.kind === 'cutout' && Array.isArray(profile.vertices)) {
          const xs = profile.vertices.map((v: any) => v.x);
          const ys = profile.vertices.map((v: any) => v.y);
          cutoutBoxes.push({
            min: { x: Math.min(...xs), y: Math.min(...ys) },
            max: { x: Math.max(...xs), y: Math.max(...ys) },
          });
        }
      }
    }

    for (const comp of ctx.components) {
      const prefix = comp.designator.replace(/[0-9]/g, '').toUpperCase();
      if (!IC_PREFIXES.has(prefix)) continue;

      const court = transformBoundingBox(comp.footprint.courtyard, comp.transform);

      // Check rectangular board bounds
      const overLeft   = court.min.x < 0 ? -court.min.x : 0;
      const overBottom = court.min.y < 0 ? -court.min.y : 0;
      const overRight  = court.max.x > boardW ? court.max.x - boardW : 0;
      const overTop    = court.max.y > boardH ? court.max.y - boardH : 0;

      if (overLeft > 0 || overBottom > 0 || overRight > 0 || overTop > 0) {
        const sides: string[] = [];
        if (overLeft > 0)   sides.push(`left by ${overLeft.toFixed(0)} mils`);
        if (overRight > 0)  sides.push(`right by ${overRight.toFixed(0)} mils`);
        if (overBottom > 0) sides.push(`bottom by ${overBottom.toFixed(0)} mils`);
        if (overTop > 0)    sides.push(`top by ${overTop.toFixed(0)} mils`);

        violations.push({
          ruleId: '' as any,
          entityIds: [comp.id],
          message: `IC courtyard off board edge: ${comp.designator} extends past ${sides.join(', ')}`,
          severity: 'error',
          location: { x: comp.transform.position.x, y: comp.transform.position.y },
        });
      }

      // Check against cutout profiles (notches, slots)
      for (const cutout of cutoutBoxes) {
        if (boundingBoxOverlap(court, cutout)) {
          violations.push({
            ruleId: '' as any,
            entityIds: [comp.id],
            message: `IC overlaps board cutout: ${comp.designator} courtyard overlaps cutout at [${cutout.min.x},${cutout.min.y}]-[${cutout.max.x},${cutout.max.y}]`,
            severity: 'error',
            location: { x: comp.transform.position.x, y: comp.transform.position.y },
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Checks that no component bodies overlap, regardless of courtyard.
 * This catches cases like decoupling caps (C60) placed on top of IC packages
 * where the courtyard might be tight but the physical bodies conflict.
 * Uses the actual footprint boundingBox (the physical body outline).
 */
export const componentBodyOverlapChecker: RuleChecker = {
  name: 'component-body-overlap',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const comps = ctx.components;

    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const a = comps[i];
        const b = comps[j];

        // Only check components on the same layer
        if (a.layerId !== b.layerId) continue;

        const bodyA = transformBoundingBox(a.footprint.boundingBox, a.transform);
        const bodyB = transformBoundingBox(b.footprint.boundingBox, b.transform);

        if (boundingBoxOverlap(bodyA, bodyB)) {
          const midX = (a.transform.position.x + b.transform.position.x) / 2;
          const midY = (a.transform.position.y + b.transform.position.y) / 2;
          violations.push({
            ruleId: '' as any,
            entityIds: [a.id, b.id],
            message: `Component body overlap: ${a.designator} and ${b.designator} physical bodies overlap on layer ${a.layerId}`,
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
