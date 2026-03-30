// Viewport / camera
export {
  type ViewportState,
  createViewport,
  pan,
  zoomTo,
  zoomIn,
  zoomOut,
  fitToContent,
  screenToWorld,
  worldToScreen,
} from './viewport';

// Selection
export {
  type SelectionState,
  type MarqueeState,
  createSelectionState,
  select,
  deselect,
  toggleSelect,
  selectAll,
  clearSelection,
  isSelected,
  getSelectedIds,
  setHovered,
  createMarquee,
  updateMarquee,
  finalizeMarquee,
  getMarqueeBounds,
  intersectsMarquee,
} from './selection';

// History / undo-redo
export {
  type HistoryEntry,
  UndoStack,
  createHistoryEntry,
} from './history';

// Tools
export {
  EditorTool,
  type PointerEvent2D,
  type KeyEvent,
  type ToolContext,
  type ToolState,
  type ToolResult,
  createToolState,
} from './tools';

// Snapping
export {
  type SnapResult,
  type SnapTarget,
  type SnapCandidate,
  SnapTargetType,
  snapToGrid,
  snapToNearest,
  snapPoint,
} from './snap';

// Placement
export {
  type PlacementState,
  type ValidationResult,
  createPlacementState,
  startPlacement,
  updatePlacement,
  rotatePlacement,
  commitPlacement,
  cancelPlacement,
  validatePlacement,
} from './placement';

// Commands
export {
  type Command,
  MoveCommand,
  type MoveCommandArgs,
  PlaceCommand,
  type PlaceCommandArgs,
  DeleteCommand,
  type DeleteCommandArgs,
  RotateCommand,
  type RotateCommandArgs,
  CompositeCommand,
} from './commands/index';

// Tool implementations
export {
  type ToolHandler,
  type ToolOperations,
  type MeasurementOverlay,
  NOOP_RESULT,
  dirtyResult,
  SelectTool,
  PlaceTool,
  TraceTool,
  PanTool,
  MeasureTool,
  createTool,
} from './tools/index';

// Editor controller
export {
  EditorController,
  type EditorState,
  type EditorStateListener,
} from './editor-controller';
