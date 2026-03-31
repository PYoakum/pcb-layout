import type { DesignRuleViolation } from '@pcb/domain';
import { DesignRuleType, LayerType } from '@pcb/domain';
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
/**
 * Validates via layer connectivity across the z-axis.
 * Each via's fromLayerId/toLayerId must match the layers of the
 * trace segments on either side of it.
 */
export const viaLayerConnectivityChecker: RuleChecker = {
  name: 'via-layer-connectivity',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    for (const path of ctx.paths) {
      for (const via of path.vias) {
        // Find segments that touch this via position
        const touchingSegments = path.segments.filter((seg) => {
          const startDist = distanceBetweenPoints(seg.start, via.position);
          const endDist = distanceBetweenPoints(seg.end, via.position);
          return startDist < POINT_EPSILON || endDist < POINT_EPSILON;
        });

        if (touchingSegments.length === 0) {
          violations.push({
            ruleId: path.id as unknown as string as any,
            entityIds: [via.id, path.id],
            message: `Orphan via: via ${via.id} at (${via.position.x}, ${via.position.y}) has no connecting trace segments`,
            severity: 'error',
            location: via.position,
          });
          continue;
        }

        // Collect the layers of touching segments
        const touchingLayerIds = new Set(touchingSegments.map((s) => s.layerId as string));

        // The via's fromLayerId should match at least one touching segment's layer
        const fromOk = touchingLayerIds.has(via.fromLayerId as string);
        // The via's toLayerId should match at least one touching segment's layer
        const toOk = touchingLayerIds.has(via.toLayerId as string);

        if (!fromOk && !toOk) {
          violations.push({
            ruleId: path.id as unknown as string as any,
            entityIds: [via.id, path.id],
            message: `Via layer mismatch: via ${via.id} connects layers ${via.fromLayerId}→${via.toLayerId} but touching segments are on layers [${[...touchingLayerIds].join(', ')}]`,
            severity: 'error',
            location: via.position,
          });
        } else if (!fromOk) {
          violations.push({
            ruleId: path.id as unknown as string as any,
            entityIds: [via.id, path.id],
            message: `Via source layer mismatch: via ${via.id} fromLayer ${via.fromLayerId} has no connecting segment on that layer`,
            severity: 'error',
            location: via.position,
          });
        } else if (!toOk) {
          violations.push({
            ruleId: path.id as unknown as string as any,
            entityIds: [via.id, path.id],
            message: `Via target layer mismatch: via ${via.id} toLayer ${via.toLayerId} has no connecting segment on that layer`,
            severity: 'error',
            location: via.position,
          });
        }
      }
    }

    return violations;
  },
};

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

/**
 * Validates that every trace segment endpoint connects to a valid target:
 * a pad center, a via position, or another segment endpoint on the same path.
 * Catches dangling trace ends that aren't connected to any component.
 */
export const traceEndpointAlignmentChecker: RuleChecker = {
  name: 'trace-endpoint-alignment',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    // Build pad world position lookup
    const padPositions: { x: number; y: number }[] = [];
    for (const comp of ctx.components) {
      for (const pad of comp.footprint.pads) {
        padPositions.push(padWorldPosition(pad.localPosition, comp.transform));
      }
    }

    for (const path of ctx.paths) {
      const segs = path.segments;
      if (segs.length === 0) continue;

      // Collect all valid connection points for this path:
      // - all segment start/end points (internal connections)
      // - all via positions
      // - all pad positions in the net
      const connectionPoints: { x: number; y: number }[] = [];

      for (const seg of segs) {
        connectionPoints.push(seg.start, seg.end);
      }
      for (const via of path.vias) {
        connectionPoints.push(via.position);
      }

      // Get pads in this net
      const net = ctx.nets.find((n) => n.id === path.netId);
      if (net) {
        for (const padId of net.pads) {
          const padPos = padPositions.find((_, i) => {
            // Match by checking all component pads
            for (const comp of ctx.components) {
              for (const pad of comp.footprint.pads) {
                if (pad.id === padId) {
                  return true;
                }
              }
            }
            return false;
          });
        }
        // Add all net pad positions as valid targets
        for (const comp of ctx.components) {
          for (const pad of comp.footprint.pads) {
            if (net.pads.includes(pad.id)) {
              connectionPoints.push(padWorldPosition(pad.localPosition, comp.transform));
            }
          }
        }
      }

      // Check the first and last endpoints of the path (the "dangling" ends)
      const firstStart = segs[0].start;
      const lastEnd = segs[segs.length - 1].end;

      for (const endpoint of [
        { point: firstStart, segId: segs[0].id, end: 'start' },
        { point: lastEnd, segId: segs[segs.length - 1].id, end: 'end' },
      ]) {
        // Check if this endpoint is near a pad
        const nearPad = padPositions.some(
          (p) => distanceBetweenPoints(endpoint.point, p) < POINT_EPSILON * 4,
        );
        if (nearPad) continue;

        // Check if it's at a via
        const nearVia = path.vias.some(
          (v) => distanceBetweenPoints(endpoint.point, v.position) < POINT_EPSILON,
        );
        if (nearVia) continue;

        // Check if another path's segment connects here (inter-path connection)
        const otherPathConnects = ctx.paths.some((otherPath) => {
          if (otherPath.id === path.id) return false;
          return otherPath.segments.some((s) =>
            distanceBetweenPoints(endpoint.point, s.start) < POINT_EPSILON ||
            distanceBetweenPoints(endpoint.point, s.end) < POINT_EPSILON,
          );
        });
        if (otherPathConnects) continue;

        violations.push({
          ruleId: '' as any,
          entityIds: [endpoint.segId, path.id],
          message: `Dangling trace: ${endpoint.end} of segment ${endpoint.segId} at (${endpoint.point.x}, ${endpoint.point.y}) is not connected to any pad, via, or other trace`,
          severity: 'warning',
          location: endpoint.point,
        });
      }
    }

    return violations;
  },
};

// ─── Net-to-layer classification ────────────────────────────────────────────

/** Known power/ground net name patterns that should be on plane layers. */
const POWER_NET_PATTERNS = [
  /^V(DD|SS|CC|PP|REF)/i,
  /^GND/i,
  /^AVDD/i,
  /^DVDD/i,
];

function isPowerNet(name: string): boolean {
  return POWER_NET_PATTERNS.some((re) => re.test(name));
}

/**
 * Validates that power/ground bus traces are routed on plane layers
 * and signal traces are on signal layers. Catches the common mistake
 * of routing everything on a single layer.
 */
export const traceLayerAssignmentChecker: RuleChecker = {
  name: 'trace-layer-assignment',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];
    if (ctx.board.layers.length < 2) return violations;

    const layerTypeMap = new Map<string, string>();
    for (const layer of ctx.board.layers) {
      layerTypeMap.set(layer.id as string, layer.type);
    }

    const planeLayerIds = new Set(
      ctx.board.layers.filter((l) => l.type === LayerType.Plane).map((l) => l.id as string),
    );

    if (planeLayerIds.size === 0) return violations;

    const netNames = new Map<string, string>();
    for (const net of ctx.nets) {
      netNames.set(net.id as string, net.name);
    }

    for (const path of ctx.paths) {
      const netName = netNames.get(path.netId as string) ?? '';
      const power = isPowerNet(netName);

      for (const seg of path.segments) {
        const segLayerType = layerTypeMap.get(seg.layerId as string);

        if (power && segLayerType === 'signal') {
          violations.push({
            ruleId: '' as any,
            entityIds: [seg.id, path.id],
            message: `Layer assignment: power/ground net "${netName}" segment ${seg.id} is on a signal layer (should be on a plane layer)`,
            severity: 'warning',
            location: { x: seg.start.x, y: seg.start.y },
          });
        }

        if (!power && segLayerType === 'plane') {
          violations.push({
            ruleId: '' as any,
            entityIds: [seg.id, path.id],
            message: `Layer assignment: signal net "${netName}" segment ${seg.id} is on a plane layer (should be on a signal layer)`,
            severity: 'warning',
            location: { x: seg.start.x, y: seg.start.y },
          });
        }
      }
    }

    return violations;
  },
};
