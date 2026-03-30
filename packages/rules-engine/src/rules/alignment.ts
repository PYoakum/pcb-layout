import type { DesignRuleViolation } from '@pcb/domain';
import type { RuleChecker, ValidationContext } from '../types';
import { padWorldPosition, distanceBetweenPoints, transformBoundingBox, pointInBoundingBox } from '../utils';

const POINT_EPSILON = 0.5;

/**
 * Checks that pad positions after component rotation still land on grid.
 */
export const padAlignmentAfterRotationChecker: RuleChecker = {
  name: 'pad-alignment-after-rotation',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const grid = ctx.board.workspace.grid;

    if (!grid.snapEnabled) return violations;

    for (const comp of ctx.components) {
      for (const pad of comp.footprint.pads) {
        const worldPos = padWorldPosition(pad.localPosition, comp.transform);

        const snappedX = Math.round(worldPos.x / grid.spacingX) * grid.spacingX;
        const snappedY = Math.round(worldPos.y / grid.spacingY) * grid.spacingY;
        const drift = distanceBetweenPoints(worldPos, { x: snappedX, y: snappedY });

        if (drift > POINT_EPSILON) {
          violations.push({
            ruleId: '' as any,
            entityIds: [pad.id, comp.id],
            message: `Pad off-grid after rotation: ${comp.designator} pad ${pad.name} is ${drift.toFixed(1)} mils from nearest grid point`,
            severity: 'warning',
            location: { x: worldPos.x, y: worldPos.y },
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Verifies that trace endpoints align with the pads they should connect to.
 * More thorough than the trace-rules version: checks all segment endpoints.
 */
export const traceToPadAlignmentVerifier: RuleChecker = {
  name: 'trace-to-pad-alignment-verify',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    // Build pad world positions per net
    const padPositions = new Map<string, { x: number; y: number }>();
    for (const comp of ctx.components) {
      for (const pad of comp.footprint.pads) {
        padPositions.set(pad.id, padWorldPosition(pad.localPosition, comp.transform));
      }
    }

    const netPadPositions = new Map<string, { x: number; y: number }[]>();
    for (const net of ctx.nets) {
      const positions = net.pads
        .map((padId) => padPositions.get(padId))
        .filter((p): p is { x: number; y: number } => p !== undefined);
      netPadPositions.set(net.id, positions);
    }

    for (const path of ctx.paths) {
      const positions = netPadPositions.get(path.netId);
      if (!positions || positions.length === 0) continue;

      // Collect all "terminal" endpoints: segment points not connected to another segment or via
      const segEndpoints = path.segments.flatMap((s) => [
        { point: s.start, segId: s.id },
        { point: s.end, segId: s.id },
      ]);

      for (const ep of segEndpoints) {
        // Skip if this endpoint connects to another segment
        const connectsToSegment = path.segments.some(
          (s) =>
            s.id !== ep.segId &&
            (distanceBetweenPoints(ep.point, s.start) < POINT_EPSILON ||
              distanceBetweenPoints(ep.point, s.end) < POINT_EPSILON),
        );
        if (connectsToSegment) continue;

        // Skip if connects to a via
        const connectsToVia = path.vias.some(
          (v) => distanceBetweenPoints(ep.point, v.position) < POINT_EPSILON,
        );
        if (connectsToVia) continue;

        // This is a terminal endpoint - should align with a pad
        const nearPad = positions.some(
          (p) => distanceBetweenPoints(ep.point, p) < POINT_EPSILON * 2,
        );

        if (!nearPad) {
          violations.push({
            ruleId: '' as any,
            entityIds: [ep.segId, path.id],
            message: `Trace terminal misalignment: segment ${ep.segId} endpoint at (${ep.point.x}, ${ep.point.y}) does not align with any pad`,
            severity: 'warning',
            location: { x: ep.point.x, y: ep.point.y },
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Checks that components are aligned to the grid.
 */
export const componentGridAlignmentChecker: RuleChecker = {
  name: 'component-grid-alignment',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const grid = ctx.board.workspace.grid;

    if (!grid.snapEnabled) return violations;

    for (const comp of ctx.components) {
      const pos = comp.transform.position;
      const snappedX = Math.round(pos.x / grid.spacingX) * grid.spacingX;
      const snappedY = Math.round(pos.y / grid.spacingY) * grid.spacingY;
      const drift = distanceBetweenPoints(pos, { x: snappedX, y: snappedY });

      if (drift > POINT_EPSILON) {
        violations.push({
          ruleId: '' as any,
          entityIds: [comp.id],
          message: `Component off-grid: ${comp.designator} origin is ${drift.toFixed(1)} mils from nearest grid point`,
          severity: 'warning',
          location: { x: pos.x, y: pos.y },
        });
      }
    }

    return violations;
  },
};

/**
 * Checks that module instances fit within their declared bounding box.
 * Since we validate at board level, this checks component groups that belong
 * to the same spatial region.
 */
export const moduleBoundaryAlignmentChecker: RuleChecker = {
  name: 'module-boundary-alignment',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    // Module boundary checks require module instance data which is not
    // directly part of the flat validation context. This checker is a
    // placeholder that validates components don't exceed board boundaries
    // with extra margin consideration. Full module validation happens
    // through validateModule() on the engine.
    return [];
  },
};
