import type { Point2D, GridConfig, LayerId } from '@pcb/domain';
import type { ViewportState } from './viewport';
import type { SelectionState } from './selection';

export enum EditorTool {
  Select = 'select',
  Place = 'place',
  Trace = 'trace',
  Pan = 'pan',
  Measure = 'measure',
}

export interface PointerEvent2D {
  screenPoint: Point2D;
  worldPoint: Point2D;
  button: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export interface KeyEvent {
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export interface ToolContext {
  viewport: ViewportState;
  selection: SelectionState;
  gridConfig: GridConfig;
  activeLayerId: LayerId;
  traceWidth: number;
}

export interface ToolState {
  tool: EditorTool;

  onPointerDown?(event: PointerEvent2D, ctx: ToolContext): ToolResult;
  onPointerMove?(event: PointerEvent2D, ctx: ToolContext): ToolResult;
  onPointerUp?(event: PointerEvent2D, ctx: ToolContext): ToolResult;
  onKeyDown?(event: KeyEvent, ctx: ToolContext): ToolResult;
}

export interface ToolResult {
  /** Updated viewport, if changed */
  viewport?: Partial<ViewportState>;
  /** Updated selection, if changed */
  selection?: Partial<SelectionState>;
  /** Cursor style to apply */
  cursor?: string;
  /** Whether to request a re-render */
  dirty?: boolean;
}

export function createToolState(tool: EditorTool): ToolState {
  return { tool };
}
