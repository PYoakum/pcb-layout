import type { DesignRuleViolation, Module, Component } from '@pcb/domain';
import type { RuleChecker, ValidationContext } from '../types';
import { transformBoundingBox, boundingBoxOverlap } from '../utils';

/**
 * Checks that a module has at least one component.
 */
export const moduleHasComponentsChecker: RuleChecker = {
  name: 'module-has-components',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    // This checker operates on the synthetic board name convention "module:<name>"
    if (!ctx.board.name.startsWith('module:')) return [];

    if (ctx.components.length === 0) {
      return [
        {
          ruleId: '' as any,
          entityIds: [],
          message: 'Module must have at least one component',
          severity: 'error',
          location: { x: 0, y: 0 },
        },
      ];
    }
    return [];
  },
};

/**
 * Checks that a module has at least one exposed pin.
 */
export const moduleHasExposedPinsChecker: RuleChecker = {
  name: 'module-has-exposed-pins',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    if (!ctx.board.name.startsWith('module:')) return [];

    // We check nets as a proxy -- a module with no nets and no pads
    // likely has no exposed pins. The real check happens at the Module level.
    if (ctx.nets.length === 0 && ctx.components.length > 0) {
      return [
        {
          ruleId: '' as any,
          entityIds: [],
          message: 'Module should have at least one exposed pin for external connectivity',
          severity: 'warning',
          location: { x: 0, y: 0 },
        },
      ];
    }
    return [];
  },
};

/**
 * Checks that all internal nets in a module are connected (have at least two pads).
 */
export const moduleInternalNetsConnectedChecker: RuleChecker = {
  name: 'module-internal-nets-connected',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    if (!ctx.board.name.startsWith('module:')) return [];

    const violations: DesignRuleViolation[] = [];
    for (const net of ctx.nets) {
      if (net.pads.length < 2) {
        violations.push({
          ruleId: '' as any,
          entityIds: [net.id],
          message: `Internal net "${net.name}" has fewer than 2 pad connections`,
          severity: 'warning',
          location: { x: 0, y: 0 },
        });
      }
    }
    return violations;
  },
};

/**
 * Checks that the module bounding box has non-zero dimensions.
 */
export const moduleBoundingBoxValidChecker: RuleChecker = {
  name: 'module-bounding-box-valid',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    if (!ctx.board.name.startsWith('module:')) return [];

    const w = ctx.board.workspace.width;
    const h = ctx.board.workspace.height;

    if (w <= 0 || h <= 0) {
      return [
        {
          ruleId: '' as any,
          entityIds: [],
          message: `Module bounding box has invalid dimensions (${w} x ${h})`,
          severity: 'error',
          location: { x: 0, y: 0 },
        },
      ];
    }
    return [];
  },
};

/**
 * Checks that the module version follows semver pattern (major.minor.patch).
 */
export function validateModuleVersion(version: string): DesignRuleViolation[] {
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    return [
      {
        ruleId: '' as any,
        entityIds: [],
        message: `Module version "${version}" does not follow semver pattern (e.g., 1.0.0)`,
        severity: 'error',
        location: { x: 0, y: 0 },
      },
    ];
  }
  return [];
}

/**
 * Checks for overlapping components within a module.
 */
export const moduleComponentOverlapChecker: RuleChecker = {
  name: 'module-component-overlap',
  check(ctx: ValidationContext): DesignRuleViolation[] {
    if (!ctx.board.name.startsWith('module:')) return [];

    const violations: DesignRuleViolation[] = [];
    const comps = ctx.components;

    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        const a = comps[i];
        const b = comps[j];
        if (a.layerId !== b.layerId) continue;

        const boxA = transformBoundingBox(a.footprint.courtyard, a.transform);
        const boxB = transformBoundingBox(b.footprint.courtyard, b.transform);

        if (boundingBoxOverlap(boxA, boxB)) {
          const midX = (a.transform.position.x + b.transform.position.x) / 2;
          const midY = (a.transform.position.y + b.transform.position.y) / 2;
          violations.push({
            ruleId: '' as any,
            entityIds: [a.id, b.id],
            message: `Module component overlap: ${a.designator} and ${b.designator}`,
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
 * Validates exposed pins reference valid internal component pins.
 */
export function validateExposedPins(
  module: { exposedPins: { pinId: string; externalName: string }[] },
  components: Component[],
): DesignRuleViolation[] {
  const violations: DesignRuleViolation[] = [];

  // Collect all valid pin IDs from components
  const validPinIds = new Set<string>();
  for (const comp of components) {
    for (const pin of comp.footprint.pins) {
      validPinIds.add(pin.id);
    }
  }

  for (const exposed of module.exposedPins) {
    if (!exposed.pinId) {
      violations.push({
        ruleId: '' as any,
        entityIds: [],
        message: `Exposed pin "${exposed.externalName}" has no internal pin reference`,
        severity: 'error',
        location: { x: 0, y: 0 },
      });
    } else if (validPinIds.size > 0 && !validPinIds.has(exposed.pinId)) {
      violations.push({
        ruleId: '' as any,
        entityIds: [],
        message: `Exposed pin "${exposed.externalName}" references invalid internal pin "${exposed.pinId}"`,
        severity: 'error',
        location: { x: 0, y: 0 },
      });
    }
  }

  return violations;
}
