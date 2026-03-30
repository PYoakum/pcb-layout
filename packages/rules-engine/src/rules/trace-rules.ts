import type { DesignRuleViolation } from '@pcb/domain';
import { DesignRuleType } from '@pcb/domain';
import type { RuleChecker, ValidationContext } from '../types';
import { distanceBetweenPoints, padWorldPosition } from '../utils';

const POINT_EPSILON = 0.5; // mils tolerance for point matching

/**
 * Checks that all trace segments meet the minimum trace width.
 */
export const minTraceWidthChecker: RuleChecker = {
  name: 'min-trace-width',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const rule = ctx.rules.find(
      (r) => r.type === DesignRuleType.MinTraceWidth && r.enabled,
    );
    if (!rule) return violations;

    const minWidth = rule.value;

    for (const path of ctx.paths) {
      for (const seg of path.segments) {
        if (seg.width < minWidth) {
          violations.push({
            ruleId: rule.id,
            entityIds: [seg.id, path.id],
            message: `Trace width violation: segment ${seg.id} has width ${seg.width} mils (minimum ${minWidth} mils)`,
            severity: 'error',
            location: { x: seg.start.x, y: seg.start.y },
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Checks that trace segments within a path connect end-to-end.
 */
export const traceConnectivityChecker: RuleChecker = {
  name: 'trace-connectivity',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    for (const path of ctx.paths) {
      const segs = path.segments;
      if (segs.length < 2) continue;

      for (let i = 0; i < segs.length - 1; i++) {
        const curr = segs[i];
        const next = segs[i + 1];

        // The end of the current segment should connect to the start of the next
        // (or they can share a via between layers)
        const endToStart = distanceBetweenPoints(curr.end, next.start);
        const endToEnd = distanceBetweenPoints(curr.end, next.end);
        const startToStart = distanceBetweenPoints(curr.start, next.start);

        const minDist = Math.min(endToStart, endToEnd, startToStart);

        if (minDist > POINT_EPSILON) {
          // Check if a via bridges the gap
          const viaConnects = path.vias.some((v) => {
            const toCurr = distanceBetweenPoints(v.position, curr.end);
            const toNext = Math.min(
              distanceBetweenPoints(v.position, next.start),
              distanceBetweenPoints(v.position, next.end),
            );
            return toCurr < POINT_EPSILON && toNext < POINT_EPSILON;
          });

          if (!viaConnects) {
            violations.push({
              ruleId: path.id as unknown as string as any,
              entityIds: [curr.id, next.id],
              message: `Trace connectivity break: segments ${curr.id} and ${next.id} in path ${path.id} are not connected (gap: ${minDist.toFixed(1)} mils)`,
              severity: 'error',
              location: { x: curr.end.x, y: curr.end.y },
            });
          }
        }
      }
    }

    return violations;
  },
};

/**
 * Checks minimum via drill size.
 */
export const viaDrillSizeChecker: RuleChecker = {
  name: 'via-drill-size',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const rule = ctx.rules.find(
      (r) => r.type === DesignRuleType.MinDrillSize && r.enabled,
    );
    if (!rule) return violations;

    const minDrill = rule.value;

    for (const path of ctx.paths) {
      for (const via of path.vias) {
        if (via.drillDiameter < minDrill) {
          violations.push({
            ruleId: rule.id,
            entityIds: [via.id, path.id],
            message: `Via drill size violation: via ${via.id} has drill diameter ${via.drillDiameter} mils (minimum ${minDrill} mils)`,
            severity: 'error',
            location: { x: via.position.x, y: via.position.y },
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Checks minimum via annular ring.
 * Annular ring = (outerDiameter - drillDiameter) / 2
 */
export const viaAnnularRingChecker: RuleChecker = {
  name: 'via-annular-ring',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const rule = ctx.rules.find(
      (r) => r.type === DesignRuleType.MinAnnularRing && r.enabled,
    );
    if (!rule) return violations;

    const minRing = rule.value;

    for (const path of ctx.paths) {
      for (const via of path.vias) {
        const ring = (via.outerDiameter - via.drillDiameter) / 2;
        if (ring < minRing) {
          violations.push({
            ruleId: rule.id,
            entityIds: [via.id, path.id],
            message: `Annular ring violation: via ${via.id} has ${ring.toFixed(1)} mil annular ring (minimum ${minRing} mils)`,
            severity: 'error',
            location: { x: via.position.x, y: via.position.y },
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Checks that trace endpoints align with component pads.
 * A trace path belonging to a net should start/end at pads in that net.
 */
export const traceToPadAlignmentChecker: RuleChecker = {
  name: 'trace-to-pad-alignment',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    // Build a lookup: padId -> world position
    const padPositions = new Map<string, { x: number; y: number }>();
    for (const comp of ctx.components) {
      for (const pad of comp.footprint.pads) {
        const worldPos = padWorldPosition(pad.localPosition, comp.transform);
        padPositions.set(pad.id, worldPos);
      }
    }

    for (const path of ctx.paths) {
      if (path.segments.length === 0) continue;

      const net = ctx.nets.find((n) => n.id === path.netId);
      if (!net) continue;

      // Get world positions of pads in this net
      const netPadPositions = net.pads
        .map((padId) => padPositions.get(padId))
        .filter((p): p is { x: number; y: number } => p !== undefined);

      if (netPadPositions.length === 0) continue;

      // Check first segment start and last segment end
      const endpoints = [
        { point: path.segments[0].start, segId: path.segments[0].id, end: 'start' },
        { point: path.segments[path.segments.length - 1].end, segId: path.segments[path.segments.length - 1].id, end: 'end' },
      ];

      for (const ep of endpoints) {
        // Check if endpoint is near a via (which handles layer transitions)
        const nearVia = path.vias.some(
          (v) => distanceBetweenPoints(ep.point, v.position) < POINT_EPSILON,
        );
        if (nearVia) continue;

        const nearPad = netPadPositions.some(
          (p) => distanceBetweenPoints(ep.point, p) < POINT_EPSILON * 2,
        );

        if (!nearPad) {
          violations.push({
            ruleId: path.netId as unknown as string as any,
            entityIds: [ep.segId, path.id],
            message: `Trace-to-pad misalignment: ${ep.end} of segment ${ep.segId} in path ${path.id} does not align with any pad in net ${net.name}`,
            severity: 'warning',
            location: { x: ep.point.x, y: ep.point.y },
          });
        }
      }
    }

    return violations;
  },
};
