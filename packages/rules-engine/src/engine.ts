import type {
  Board,
  Component,
  Net,
  TracePath,
  DesignRule,
  DesignRuleViolation,
  Module,
  DesignRuleId,
} from '@pcb/domain';
import { DesignRuleType, createId } from '@pcb/domain';
import type { ValidationContext, ValidationResult, RuleChecker } from './types';

// Import all checkers
import {
  componentClearanceChecker,
  traceClearanceChecker,
  traceToComponentClearanceChecker,
  traceToBoardEdgeClearanceChecker,
} from './rules/clearance';
import {
  minTraceWidthChecker,
  traceConnectivityChecker,
  viaDrillSizeChecker,
  viaAnnularRingChecker,
  traceToPadAlignmentChecker,
} from './rules/trace-rules';
import {
  componentWithinBoundsChecker,
  componentOverlapChecker,
  componentOnValidLayerChecker,
  padNetAssignmentChecker,
} from './rules/component-rules';
import {
  netConnectivityChecker,
  unconnectedPinChecker,
  floatingNetChecker,
  shortCircuitChecker,
} from './rules/net-rules';
import {
  padAlignmentAfterRotationChecker,
  traceToPadAlignmentVerifier,
  componentGridAlignmentChecker,
  moduleBoundaryAlignmentChecker,
} from './rules/alignment';
import {
  moduleHasComponentsChecker,
  moduleHasExposedPinsChecker,
  moduleInternalNetsConnectedChecker,
  moduleBoundingBoxValidChecker,
  moduleComponentOverlapChecker,
} from './rules/module-rules';

export class ValidationEngine {
  private rules: RuleChecker[] = [];

  constructor() {
    // Register all default rule checkers
    this.registerDefaults();
  }

  registerRule(checker: RuleChecker): void {
    this.rules.push(checker);
  }

  validate(context: ValidationContext): ValidationResult {
    const violations: DesignRuleViolation[] = [];
    const warnings: DesignRuleViolation[] = [];

    for (const checker of this.rules) {
      const results = checker.check(context);
      for (const v of results) {
        if (v.severity === 'warning') {
          warnings.push(v);
        } else {
          violations.push(v);
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings,
      checkedRules: this.rules.length,
      timestamp: new Date().toISOString(),
    };
  }

  validateBoard(
    board: Board,
    components: Component[],
    nets: Net[],
    paths: TracePath[],
    rules: DesignRule[],
  ): ValidationResult {
    return this.validate({ board, components, nets, paths, rules });
  }

  validateModule(
    module: Module,
    components: Component[],
    nets: Net[],
    paths: TracePath[],
    rules: DesignRule[],
  ): ValidationResult {
    // Filter to only the entities belonging to this module
    const moduleComponentIds = new Set(module.components);
    const moduleNetIds = new Set(module.internalNets);
    const modulePathIds = new Set(module.internalPaths);

    const moduleComponents = components.filter((c) => moduleComponentIds.has(c.id));
    const moduleNets = nets.filter((n) => moduleNetIds.has(n.id));
    const modulePaths = paths.filter((p) => modulePathIds.has(p.id));

    // Create a synthetic board from the module's bounding box for bounds checking
    const syntheticBoard: Board = {
      id: '' as any,
      projectId: '' as any,
      name: `module:${module.name}`,
      workspace: {
        width: module.boundingBox.max.x - module.boundingBox.min.x,
        height: module.boundingBox.max.y - module.boundingBox.min.y,
        grid: { spacingX: 5, spacingY: 5, subdivisions: 2, visible: true, snapEnabled: false },
        layerCount: 2,
      },
      layers: [],
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    };

    return this.validate({
      board: syntheticBoard,
      components: moduleComponents,
      nets: moduleNets,
      paths: modulePaths,
      rules,
    });
  }

  getDefaultRules(): DesignRule[] {
    return [
      {
        id: createId<DesignRuleId>('dr'),
        type: DesignRuleType.MinTraceWidth,
        name: 'Minimum Trace Width',
        value: 6,
        unit: 'mil',
        enabled: true,
      },
      {
        id: createId<DesignRuleId>('dr'),
        type: DesignRuleType.MinClearance,
        name: 'Minimum Clearance',
        value: 6,
        unit: 'mil',
        enabled: true,
      },
      {
        id: createId<DesignRuleId>('dr'),
        type: DesignRuleType.MinDrillSize,
        name: 'Minimum Drill Size',
        value: 10,
        unit: 'mil',
        enabled: true,
      },
      {
        id: createId<DesignRuleId>('dr'),
        type: DesignRuleType.MinAnnularRing,
        name: 'Minimum Annular Ring',
        value: 5,
        unit: 'mil',
        enabled: true,
      },
      {
        id: createId<DesignRuleId>('dr'),
        type: DesignRuleType.TraceToEdge,
        name: 'Trace to Board Edge',
        value: 10,
        unit: 'mil',
        enabled: true,
      },
      {
        id: createId<DesignRuleId>('dr'),
        type: DesignRuleType.ComponentToEdge,
        name: 'Component to Board Edge',
        value: 10,
        unit: 'mil',
        enabled: true,
      },
    ];
  }

  private registerDefaults(): void {
    // Clearance checks
    this.registerRule(componentClearanceChecker);
    this.registerRule(traceClearanceChecker);
    this.registerRule(traceToComponentClearanceChecker);
    this.registerRule(traceToBoardEdgeClearanceChecker);

    // Trace checks
    this.registerRule(minTraceWidthChecker);
    this.registerRule(traceConnectivityChecker);
    this.registerRule(viaDrillSizeChecker);
    this.registerRule(viaAnnularRingChecker);
    this.registerRule(traceToPadAlignmentChecker);

    // Component checks
    this.registerRule(componentWithinBoundsChecker);
    this.registerRule(componentOverlapChecker);
    this.registerRule(componentOnValidLayerChecker);
    this.registerRule(padNetAssignmentChecker);

    // Net checks
    this.registerRule(netConnectivityChecker);
    this.registerRule(unconnectedPinChecker);
    this.registerRule(floatingNetChecker);
    this.registerRule(shortCircuitChecker);

    // Alignment checks
    this.registerRule(padAlignmentAfterRotationChecker);
    this.registerRule(traceToPadAlignmentVerifier);
    this.registerRule(componentGridAlignmentChecker);
    this.registerRule(moduleBoundaryAlignmentChecker);

    // Module checks
    this.registerRule(moduleHasComponentsChecker);
    this.registerRule(moduleHasExposedPinsChecker);
    this.registerRule(moduleInternalNetsConnectedChecker);
    this.registerRule(moduleBoundingBoxValidChecker);
    this.registerRule(moduleComponentOverlapChecker);
  }
}
