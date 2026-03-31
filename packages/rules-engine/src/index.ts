// Validation engine
export { ValidationEngine } from './engine';

// Types
export type { ValidationContext, ValidationResult, RuleChecker } from './types';

// Rule checkers - clearance
export {
  componentClearanceChecker,
  traceClearanceChecker,
  traceToComponentClearanceChecker,
  traceToBoardEdgeClearanceChecker,
} from './rules/clearance';

// Rule checkers - trace
export {
  minTraceWidthChecker,
  traceConnectivityChecker,
  viaDrillSizeChecker,
  viaAnnularRingChecker,
  viaLayerConnectivityChecker,
  traceToPadAlignmentChecker,
  traceLayerAssignmentChecker,
  traceEndpointAlignmentChecker,
} from './rules/trace-rules';

// Rule checkers - component
export {
  componentWithinBoundsChecker,
  componentOverlapChecker,
  componentBodyOverlapChecker,
  componentOnValidLayerChecker,
  padNetAssignmentChecker,
  icWithinBoardEdgeChecker,
} from './rules/component-rules';

// Rule checkers - net
export {
  netConnectivityChecker,
  unconnectedPinChecker,
  floatingNetChecker,
  shortCircuitChecker,
} from './rules/net-rules';

// Rule checkers - alignment
export {
  padAlignmentAfterRotationChecker,
  traceToPadAlignmentVerifier,
  componentGridAlignmentChecker,
  moduleBoundaryAlignmentChecker,
} from './rules/alignment';

// Rule checkers - module
export {
  moduleHasComponentsChecker,
  moduleHasExposedPinsChecker,
  moduleInternalNetsConnectedChecker,
  moduleBoundingBoxValidChecker,
  moduleComponentOverlapChecker,
  validateModuleVersion,
  validateExposedPins,
} from './rules/module-rules';

// Utilities
export {
  boundingBoxOverlap,
  distanceBetweenPoints,
  pointInBoundingBox,
  transformBoundingBox,
  segmentDistance,
  pointToSegmentDistance,
  padWorldPosition,
  pointToBoundingBoxDistance,
  boundingBoxDistance,
} from './utils';
