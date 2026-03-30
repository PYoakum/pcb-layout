import type { Point2D } from '@pcb/domain';
import type { PointerEvent2D, KeyEvent, ToolContext, ToolResult } from '../tools';
import type { ToolHandler, ToolOperations } from './tool-handler';
import { NOOP_RESULT, dirtyResult } from './tool-handler';
import { pan } from '../viewport';

export class PanTool implements ToolHandler {
  readonly name = 'pan';

  private dragging = false;
  private lastScreenPoint: Point2D = { x: 0, y: 0 };

  activate(_ctx: ToolContext, ops: ToolOperations): void {
    ops.setCursor('grab');
  }

  deactivate(_ops: ToolOperations): void {
    this.dragging = false;
  }

  onPointerDown(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (event.button !== 0) return NOOP_RESULT;

    this.dragging = true;
    this.lastScreenPoint = { ...event.screenPoint };
    ops.setCursor('grabbing');

    return NOOP_RESULT;
  }

  onPointerMove(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (!this.dragging) return NOOP_RESULT;

    const dx = event.screenPoint.x - this.lastScreenPoint.x;
    const dy = event.screenPoint.y - this.lastScreenPoint.y;
    this.lastScreenPoint = { ...event.screenPoint };

    const newViewport = pan(ctx.viewport, dx, dy);
    return dirtyResult({ viewport: newViewport });
  }

  onPointerUp(_event: PointerEvent2D, _ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (!this.dragging) return NOOP_RESULT;

    this.dragging = false;
    ops.setCursor('grab');
    return NOOP_RESULT;
  }

  onDoubleClick(_event: PointerEvent2D, _ctx: ToolContext, _ops: ToolOperations): ToolResult {
    return NOOP_RESULT;
  }

  onKeyDown(_event: KeyEvent, _ctx: ToolContext, _ops: ToolOperations): ToolResult {
    return NOOP_RESULT;
  }
}
