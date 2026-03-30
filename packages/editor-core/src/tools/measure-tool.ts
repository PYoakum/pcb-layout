import type { Point2D } from '@pcb/domain';
import type { PointerEvent2D, KeyEvent, ToolContext, ToolResult } from '../tools';
import type { ToolHandler, ToolOperations, MeasurementOverlay } from './tool-handler';
import { NOOP_RESULT, dirtyResult } from './tool-handler';
import { snapToGrid } from '../snap';

const MILS_TO_MM = 0.0254;

export class MeasureTool implements ToolHandler {
  readonly name = 'measure';

  private startPoint: Point2D | null = null;
  private active = false;

  activate(_ctx: ToolContext, ops: ToolOperations): void {
    ops.setCursor('crosshair');
  }

  deactivate(ops: ToolOperations): void {
    this.reset(ops);
  }

  onPointerDown(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (event.button !== 0) return NOOP_RESULT;

    const snapped = snapToGrid(event.worldPoint, ctx.gridConfig);

    if (!this.active) {
      // Set first point
      this.startPoint = snapped.point;
      this.active = true;
      return dirtyResult();
    }

    // Set second point -- finalize measurement
    const measurement = this.computeMeasurement(this.startPoint!, snapped.point);
    ops.setMeasurement(measurement);

    // Reset for next measurement
    this.startPoint = null;
    this.active = false;
    return dirtyResult();
  }

  onPointerMove(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (!this.active || !this.startPoint) return NOOP_RESULT;

    const snapped = snapToGrid(event.worldPoint, ctx.gridConfig);
    const measurement = this.computeMeasurement(this.startPoint, snapped.point);
    ops.setMeasurement(measurement);

    return dirtyResult();
  }

  onPointerUp(_event: PointerEvent2D, _ctx: ToolContext, _ops: ToolOperations): ToolResult {
    return NOOP_RESULT;
  }

  onDoubleClick(_event: PointerEvent2D, _ctx: ToolContext, _ops: ToolOperations): ToolResult {
    return NOOP_RESULT;
  }

  onKeyDown(event: KeyEvent, _ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (event.key === 'Escape') {
      this.reset(ops);
      return dirtyResult();
    }
    return NOOP_RESULT;
  }

  private computeMeasurement(start: Point2D, end: Point2D): MeasurementOverlay {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distanceMils = Math.sqrt(dx * dx + dy * dy);
    const distanceMm = distanceMils * MILS_TO_MM;

    return { start, end, distanceMils, distanceMm };
  }

  private reset(ops: ToolOperations): void {
    this.startPoint = null;
    this.active = false;
    ops.setMeasurement(null);
  }
}
