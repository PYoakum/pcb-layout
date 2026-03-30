import type { Point2D, Component, TracePath } from '@pcb/domain';
import type { PointerEvent2D, KeyEvent, ToolContext, ToolResult } from '../tools';
import type { Command } from '../commands/types';
import type { MarqueeState } from '../selection';

/**
 * Context provided to tool handlers for accessing and mutating editor state.
 * Tools should not depend on React or any store directly -- they operate
 * through this abstraction.
 */
export interface ToolOperations {
  // Component access
  getComponents(): Component[];
  getComponentById(id: string): Component | undefined;
  getComponentsInRect(min: Point2D, max: Point2D): Component[];

  // Trace access
  getTraces(): TracePath[];

  // Mutation via commands (for undo/redo)
  executeCommand(command: Command): void;

  // Direct add/remove callbacks used by commands
  addComponent(component: Component): void;
  removeComponent(id: string): void;
  addTrace(trace: TracePath): void;
  removeTrace(id: string): void;

  // Event callbacks for UI updates
  requestRender(): void;
  setCursor(cursor: string): void;

  // Ghost / overlay state
  setGhostComponent(component: Component | null): void;
  setActiveTrace(points: Point2D[] | null): void;
  setMarquee(marquee: MarqueeState | null): void;
  setMeasurement(measurement: MeasurementOverlay | null): void;
}

export interface MeasurementOverlay {
  start: Point2D;
  end: Point2D;
  distanceMils: number;
  distanceMm: number;
}

/**
 * Base interface for all tool handlers. Each tool implements this interface
 * and manages its own internal state (drag tracking, ghost position, etc).
 */
export interface ToolHandler {
  readonly name: string;

  /** Called when this tool becomes active */
  activate(ctx: ToolContext, ops: ToolOperations): void;

  /** Called when this tool is deactivated (switching to another tool) */
  deactivate(ops: ToolOperations): void;

  onPointerDown(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult;
  onPointerMove(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult;
  onPointerUp(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult;
  onDoubleClick(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult;
  onKeyDown(event: KeyEvent, ctx: ToolContext, ops: ToolOperations): ToolResult;
}

/** No-op result constant */
export const NOOP_RESULT: ToolResult = {};

/** Helper to create a dirty (re-render) result */
export function dirtyResult(overrides?: Partial<ToolResult>): ToolResult {
  return { dirty: true, ...overrides };
}
