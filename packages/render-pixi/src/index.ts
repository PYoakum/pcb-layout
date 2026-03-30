// Main canvas
export { PCBCanvas, type PCBCanvasOptions } from './canvas';

// Sub-renderers
export { GridRenderer } from './grid-renderer';
export { BoardRenderer } from './board-renderer';
export { ComponentRenderer, type ComponentRenderOptions } from './component-renderer';
export { TraceRenderer, type TraceRenderOptions } from './trace-renderer';
export { SelectionRenderer } from './selection-renderer';
export { LayerRenderer, resolveLayerColor, LAYER_COLORS } from './layer-renderer';

// Interaction
export {
  InteractionManager,
  type InteractionEvent,
  type InteractionEventType,
  type InteractionHandler,
} from './interaction';

// Overlay renderer
export { OverlayRenderer, type OverlayState } from './overlay-renderer';
