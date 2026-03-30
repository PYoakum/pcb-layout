// Three.js 3D PCB renderer - barrel exports

export { PCBScene } from './scene';
export { CameraController, CameraPreset } from './camera-controller';
export { BoardBuilder } from './board-builder';
export { ComponentBuilder } from './component-builder';
export { TraceBuilder } from './trace-builder';
export { PCBMaterials, disposeMaterials } from './materials';
export { LayerVisibilityController } from './layer-visibility';
export type { LayerVisibilityState } from './layer-visibility';
export { InteractionManager } from './interaction';
export type { HoverInfo, MeasurementResult, SelectionCallback, HoverCallback, MeasurementCallback } from './interaction';
export {
  domainToThree,
  milsToUnits,
  unitsToMils,
  boundingBoxToBox3,
  boundingBoxCenter,
  boundingBoxSize,
  hexToColor,
  createRoundedRectShape,
  rotationToRadians,
  disposeObject,
} from './utils';
