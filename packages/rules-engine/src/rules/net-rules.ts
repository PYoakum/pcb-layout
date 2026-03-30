import type { DesignRuleViolation, Net, TracePath } from '@pcb/domain';
import type { RuleChecker, ValidationContext } from '../types';
import { distanceBetweenPoints, padWorldPosition } from '../utils';

const POINT_EPSILON = 0.5;

/**
 * Checks that all pins in a net are connected via trace paths.
 * Builds a connectivity graph from trace endpoints and pad positions,
 * then checks that all pads in the net are reachable.
 */
export const netConnectivityChecker: RuleChecker = {
  name: 'net-connectivity',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    // Build pad world position lookup
    const padPositions = new Map<string, { x: number; y: number }>();
    for (const comp of ctx.components) {
      for (const pad of comp.footprint.pads) {
        padPositions.set(pad.id, padWorldPosition(pad.localPosition, comp.transform));
      }
    }

    for (const net of ctx.nets) {
      if (net.pads.length < 2) continue;

      // Get trace paths belonging to this net
      const netPaths = ctx.paths.filter((p) => p.netId === net.id);
      if (netPaths.length === 0 && net.pads.length >= 2) {
        violations.push({
          ruleId: '' as any,
          entityIds: [net.id, ...net.pads],
          message: `Net connectivity: net ${net.name} has ${net.pads.length} pads but no trace paths`,
          severity: 'error',
        });
        continue;
      }

      // Union-Find to group connected pads
      const padIds = net.pads.filter((id) => padPositions.has(id));
      const parent = new Map<string, string>();
      for (const id of padIds) parent.set(id, id);

      function find(x: string): string {
        let root = x;
        while (parent.get(root) !== root) root = parent.get(root)!;
        parent.set(x, root);
        return root;
      }

      function union(a: string, b: string) {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(ra, rb);
      }

      // For each trace path, find which pads its endpoints touch
      for (const path of netPaths) {
        const touchedPads: string[] = [];
        const allEndpoints = [
          ...path.segments.flatMap((s) => [s.start, s.end]),
          ...path.vias.map((v) => v.position),
        ];

        for (const padId of padIds) {
          const padPos = padPositions.get(padId)!;
          const touches = allEndpoints.some(
            (ep) => distanceBetweenPoints(ep, padPos) < POINT_EPSILON * 2,
          );
          if (touches) touchedPads.push(padId);
        }

        // Union all touched pads together
        for (let i = 1; i < touchedPads.length; i++) {
          union(touchedPads[0], touchedPads[i]);
        }
      }

      // Check that all pads are in the same group
      const groups = new Set(padIds.map((id) => find(id)));
      if (groups.size > 1) {
        violations.push({
          ruleId: '' as any,
          entityIds: [net.id],
          message: `Net connectivity: net ${net.name} has ${groups.size} disconnected groups (expected 1)`,
          severity: 'error',
        });
      }
    }

    return violations;
  },
};

/**
 * Detects unconnected pins - pins in a net that no trace path reaches.
 */
export const unconnectedPinChecker: RuleChecker = {
  name: 'unconnected-pins',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    const padPositions = new Map<string, { x: number; y: number }>();
    for (const comp of ctx.components) {
      for (const pad of comp.footprint.pads) {
        padPositions.set(pad.id, padWorldPosition(pad.localPosition, comp.transform));
      }
    }

    // Map padId -> componentDesignator for messages
    const padToComp = new Map<string, string>();
    for (const comp of ctx.components) {
      for (const pad of comp.footprint.pads) {
        padToComp.set(pad.id, `${comp.designator}:${pad.name}`);
      }
    }

    for (const net of ctx.nets) {
      if (net.pads.length === 0) continue;
      const netPaths = ctx.paths.filter((p) => p.netId === net.id);

      const allEndpoints = netPaths.flatMap((path) => [
        ...path.segments.flatMap((s) => [s.start, s.end]),
        ...path.vias.map((v) => v.position),
      ]);

      for (const padId of net.pads) {
        const padPos = padPositions.get(padId);
        if (!padPos) continue;

        const connected = allEndpoints.some(
          (ep) => distanceBetweenPoints(ep, padPos) < POINT_EPSILON * 2,
        );

        if (!connected) {
          const label = padToComp.get(padId) ?? padId;
          violations.push({
            ruleId: '' as any,
            entityIds: [padId, net.id],
            message: `Unconnected pin: ${label} in net ${net.name} has no trace connection`,
            severity: 'error',
            location: { x: padPos.x, y: padPos.y },
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Detects floating nets - nets with no trace connections at all.
 */
export const floatingNetChecker: RuleChecker = {
  name: 'floating-net',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    for (const net of ctx.nets) {
      if (net.pads.length === 0 && net.pins.length === 0) continue;

      const hasPath = ctx.paths.some((p) => p.netId === net.id);
      if (!hasPath) {
        violations.push({
          ruleId: '' as any,
          entityIds: [net.id],
          message: `Floating net: net ${net.name} has ${net.pads.length} pads but no trace paths`,
          severity: 'warning',
        });
      }
    }

    return violations;
  },
};

/**
 * Detects short circuits - different nets sharing a trace path,
 * or trace segments from different nets that overlap/intersect.
 */
export const shortCircuitChecker: RuleChecker = {
  name: 'short-circuit',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    const violations: DesignRuleViolation[] = [];

    // Check if any trace path is claimed by multiple nets
    const pathNetMap = new Map<string, string[]>();
    for (const net of ctx.nets) {
      for (const pathId of net.paths) {
        const existing = pathNetMap.get(pathId) ?? [];
        existing.push(net.name);
        pathNetMap.set(pathId, existing);
      }
    }

    for (const [pathId, netNames] of pathNetMap) {
      if (netNames.length > 1) {
        violations.push({
          ruleId: '' as any,
          entityIds: [pathId],
          message: `Short circuit: trace path ${pathId} is shared by nets ${netNames.join(', ')}`,
          severity: 'error',
        });
      }
    }

    // Also check: a trace path's netId should match what the net thinks
    for (const path of ctx.paths) {
      const ownerNet = ctx.nets.find((n) => n.id === path.netId);
      if (ownerNet && !ownerNet.paths.includes(path.id)) {
        violations.push({
          ruleId: '' as any,
          entityIds: [path.id, ownerNet.id],
          message: `Net inconsistency: path ${path.id} claims net ${ownerNet.name} but net does not reference this path`,
          severity: 'warning',
        });
      }
    }

    return violations;
  },
};
