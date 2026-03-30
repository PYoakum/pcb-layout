import type { DesignRuleViolation, Component, TracePath } from '@pcb/domain';
import { DesignRuleType } from '@pcb/domain';
import type { RuleChecker, ValidationContext } from '../types';
import {
  transformBoundingBox,
  boundingBoxDistance,
  pointToSegmentDistance,
  segmentDistance,
  padWorldPosition,
} from '../utils';

/**
 * Checks minimum clearance between components (courtyard-to-courtyard).
 */
export const componentClearanceChecker: RuleChecker = {
  name: 'component-clearance',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const rule = ctx.rules.find(
      (r) => r.type === DesignRuleType.MinClearance && r.enabled,
    );
    if (!rule) return violations;

    const minClearance = rule.value;
    const comps = ctx.components;

    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const a = comps[i];
        const b = comps[j];
        const boxA = transformBoundingBox(a.footprint.courtyard, a.transform);
        const boxB = transformBoundingBox(b.footprint.courtyard, b.transform);
        const dist = boundingBoxDistance(boxA, boxB);

        if (dist < minClearance) {
          const midX = (a.transform.position.x + b.transform.position.x) / 2;
          const midY = (a.transform.position.y + b.transform.position.y) / 2;
          violations.push({
            ruleId: rule.id,
            entityIds: [a.id, b.id],
            message: `Component clearance violation: ${a.designator} and ${b.designator} are ${dist.toFixed(1)} mils apart (minimum ${minClearance} mils)`,
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
 * Checks minimum clearance between trace segments on the same layer.
 */
export const traceClearanceChecker: RuleChecker = {
  name: 'trace-clearance',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const rule = ctx.rules.find(
      (r) => r.type === DesignRuleType.MinClearance && r.enabled,
    );
    if (!rule) return violations;

    const minClearance = rule.value;

    // Collect all segments across all paths, keeping net association
    const allSegs = ctx.paths.flatMap((p) =>
      p.segments.map((s) => ({ seg: s, netId: p.netId })),
    );

    for (let i = 0; i < allSegs.length; i++) {
      for (let j = i + 1; j < allSegs.length; j++) {
        const a = allSegs[i];
        const b = allSegs[j];

        // Only check segments on the same layer that belong to different nets
        if (a.seg.layerId !== b.seg.layerId) continue;
        if (a.netId === b.netId) continue;

        const dist = segmentDistance(a.seg.start, a.seg.end, b.seg.start, b.seg.end);
        // Account for trace widths: center-to-center distance minus half widths
        const effectiveDist = dist - (a.seg.width + b.seg.width) / 2;

        if (effectiveDist < minClearance) {
          const midX = (a.seg.start.x + b.seg.start.x) / 2;
          const midY = (a.seg.start.y + b.seg.start.y) / 2;
          violations.push({
            ruleId: rule.id,
            entityIds: [a.seg.id, b.seg.id],
            message: `Trace clearance violation: segments ${a.seg.id} and ${b.seg.id} have ${effectiveDist.toFixed(1)} mils clearance (minimum ${minClearance} mils)`,
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
 * Checks minimum clearance between traces and components.
 */
export const traceToComponentClearanceChecker: RuleChecker = {
  name: 'trace-to-component-clearance',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const rule = ctx.rules.find(
      (r) => r.type === DesignRuleType.MinClearance && r.enabled,
    );
    if (!rule) return violations;

    const minClearance = rule.value;

    for (const path of ctx.paths) {
      for (const seg of path.segments) {
        for (const comp of ctx.components) {
          // Skip if trace layer doesn't match component layer
          if (seg.layerId !== comp.layerId) continue;

          const box = transformBoundingBox(comp.footprint.courtyard, comp.transform);

          const distStart = pointToSegmentDistanceToBox(seg.start, seg.end, box);
          const effectiveDist = distStart - seg.width / 2;

          if (effectiveDist < minClearance) {
            violations.push({
              ruleId: rule.id,
              entityIds: [seg.id, comp.id],
              message: `Trace-to-component clearance violation: segment ${seg.id} is too close to ${comp.designator} (${effectiveDist.toFixed(1)} mils, minimum ${minClearance} mils)`,
              severity: 'error',
              location: { x: seg.start.x, y: seg.start.y },
            });
          }
        }
      }
    }

    return violations;
  },
};

/**
 * Checks minimum clearance between traces and board edges.
 */
export const traceToBoardEdgeClearanceChecker: RuleChecker = {
  name: 'trace-to-board-edge-clearance',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    const rule = ctx.rules.find(
      (r) => r.type === DesignRuleType.TraceToEdge && r.enabled,
    );
    if (!rule) return violations;

    const minDist = rule.value;
    const w = ctx.board.workspace.width;
    const h = ctx.board.workspace.height;

    // Board edges as four segments
    const edges: [{ x: number; y: number }, { x: number; y: number }][] = [
      [{ x: 0, y: 0 }, { x: w, y: 0 }],     // bottom
      [{ x: w, y: 0 }, { x: w, y: h }],       // right
      [{ x: w, y: h }, { x: 0, y: h }],       // top
      [{ x: 0, y: h }, { x: 0, y: 0 }],       // left
    ];

    for (const path of ctx.paths) {
      for (const seg of path.segments) {
        for (const [eStart, eEnd] of edges) {
          const dist = segmentDistance(seg.start, seg.end, eStart, eEnd);
          const effectiveDist = dist - seg.width / 2;

          if (effectiveDist < minDist) {
            violations.push({
              ruleId: rule.id,
              entityIds: [seg.id],
              message: `Trace-to-board-edge clearance violation: segment ${seg.id} is ${effectiveDist.toFixed(1)} mils from board edge (minimum ${minDist} mils)`,
              severity: 'error',
              location: { x: seg.start.x, y: seg.start.y },
            });
            break; // one violation per segment is enough
          }
        }
      }
    }

    return violations;
  },
};

// Helper: minimum distance from a line segment to an axis-aligned bounding box
function pointToSegmentDistanceToBox(
  segStart: { x: number; y: number },
  segEnd: { x: number; y: number },
  box: { min: { x: number; y: number }; max: { x: number; y: number } },
): number {
  // Check distance from segment to each of the 4 edges of the box
  const boxEdges: [{ x: number; y: number }, { x: number; y: number }][] = [
    [box.min, { x: box.max.x, y: box.min.y }],
    [{ x: box.max.x, y: box.min.y }, box.max],
    [box.max, { x: box.min.x, y: box.max.y }],
    [{ x: box.min.x, y: box.max.y }, box.min],
  ];

  let minDist = Infinity;
  for (const [eStart, eEnd] of boxEdges) {
    const d = segmentDistance(segStart, segEnd, eStart, eEnd);
    if (d < minDist) minDist = d;
  }
  return minDist;
}
