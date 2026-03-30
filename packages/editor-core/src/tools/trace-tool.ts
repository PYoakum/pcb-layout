import type { Point2D, TracePath, TraceSegment, Pad, Component } from '@pcb/domain';
import { createId } from '@pcb/domain';
import type { PointerEvent2D, KeyEvent, ToolContext, ToolResult } from '../tools';
import type { ToolHandler, ToolOperations } from './tool-handler';
import { NOOP_RESULT, dirtyResult } from './tool-handler';
import { snapToGrid } from '../snap';

const PAD_SNAP_THRESHOLD = 10; // mils — must click very close to pad center to snap

export class TraceTool implements ToolHandler {
  readonly name = 'trace';

  private waypoints: Point2D[] = [];
  private cursorPoint: Point2D = { x: 0, y: 0 };
  private startPadId: string | null = null;
  private netId: string | null = null;
  private active = false;

  activate(_ctx: ToolContext, ops: ToolOperations): void {
    ops.setCursor('crosshair');
  }

  deactivate(ops: ToolOperations): void {
    this.cancel(ops);
  }

  onPointerDown(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    const gridPoint = snapToGrid(event.worldPoint, ctx.gridConfig).point;

    // Right-click finishes active trace
    if (event.button === 2 && this.active && this.waypoints.length >= 2) {
      this.commitTrace(ctx, ops);
      return dirtyResult();
    }

    if (event.button !== 0) return NOOP_RESULT;

    // Check if clicking near a pad
    const padHit = this.hitTestPad(event.worldPoint, ops);

    if (!this.active) {
      // Starting a new trace
      const startPoint = padHit
        ? this.padWorldPos(padHit.component, padHit.pad)
        : gridPoint;
      this.waypoints = [startPoint];
      this.active = true;
      this.startPadId = padHit?.pad.id ?? null;
      this.netId = padHit ? this.findNetForPad(padHit.pad.id) : null;
      ops.setActiveTrace([startPoint, startPoint]);
      return dirtyResult();
    }

    // If clicking on a pad, snap to it and finish the trace
    if (padHit) {
      const endPoint = this.padWorldPos(padHit.component, padHit.pad);
      this.waypoints.push(endPoint);
      this.commitTrace(ctx, ops);
      return dirtyResult();
    }

    // Otherwise add a freehand waypoint on grid
    this.waypoints.push(gridPoint);
    this.updatePreview(ops);
    return dirtyResult();
  }

  onPointerMove(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (!this.active) return NOOP_RESULT;

    // Freehand: cursor follows grid, no pad snapping during move
    const gridPoint = snapToGrid(event.worldPoint, ctx.gridConfig).point;
    this.cursorPoint = gridPoint;
    this.updatePreview(ops);
    return dirtyResult();
  }

  onPointerUp(_event: PointerEvent2D, _ctx: ToolContext, _ops: ToolOperations): ToolResult {
    return NOOP_RESULT;
  }

  onDoubleClick(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (!this.active) return NOOP_RESULT;
    const gridPoint = snapToGrid(event.worldPoint, ctx.gridConfig).point;
    this.waypoints.push(gridPoint);
    this.commitTrace(ctx, ops);
    return dirtyResult();
  }

  onKeyDown(event: KeyEvent, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (event.key === 'Escape') {
      this.cancel(ops);
      return dirtyResult();
    }

    if (event.key === 'Enter' && this.active && this.waypoints.length >= 2) {
      this.commitTrace(ctx, ops);
      return dirtyResult();
    }

    if (event.key === 'Backspace' && this.active && this.waypoints.length > 1) {
      this.waypoints.pop();
      this.updatePreview(ops);
      return dirtyResult();
    }

    return NOOP_RESULT;
  }

  private updatePreview(ops: ToolOperations): void {
    if (!this.active) return;
    ops.setActiveTrace([...this.waypoints, this.cursorPoint]);
  }

  private commitTrace(ctx: ToolContext, ops: ToolOperations): void {
    if (this.waypoints.length < 2) {
      this.cancel(ops);
      return;
    }

    const pathId = createId<any>('trace');
    const segments: TraceSegment[] = [];

    for (let i = 0; i < this.waypoints.length - 1; i++) {
      segments.push({
        id: createId('seg'),
        pathId,
        layerId: ctx.activeLayerId,
        start: { ...this.waypoints[i] },
        end: { ...this.waypoints[i + 1] },
        width: ctx.traceWidth,
      });
    }

    const tracePath: TracePath = {
      id: pathId,
      netId: (this.netId ?? createId('net')) as any,
      segments,
      vias: [],
      debugLinks: [],
      cornerRadius: 0,
    };

    ops.addTrace(tracePath);
    ops.requestRender();
    this.reset(ops);
  }

  private cancel(ops: ToolOperations): void {
    this.reset(ops);
  }

  private reset(ops: ToolOperations): void {
    this.waypoints = [];
    this.active = false;
    this.startPadId = null;
    this.netId = null;
    this.cursorPoint = { x: 0, y: 0 };
    ops.setActiveTrace(null);
  }

  /**
   * Hit-test against raw world coordinates (NOT grid-snapped) so that
   * every pad is reachable regardless of grid alignment.
   */
  private hitTestPad(
    worldPoint: Point2D,
    ops: ToolOperations,
  ): { component: Component; pad: Pad } | null {
    let bestDist = PAD_SNAP_THRESHOLD;
    let bestHit: { component: Component; pad: Pad } | null = null;

    for (const comp of ops.getComponents()) {
      const pos = comp.transform.position;
      for (const pad of comp.footprint.pads) {
        const padWorldX = pos.x + pad.localPosition.x;
        const padWorldY = pos.y + pad.localPosition.y;
        const dx = worldPoint.x - padWorldX;
        const dy = worldPoint.y - padWorldY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestHit = { component: comp, pad };
        }
      }
    }
    return bestHit;
  }

  private padWorldPos(comp: Component, pad: Pad): Point2D {
    return {
      x: comp.transform.position.x + pad.localPosition.x,
      y: comp.transform.position.y + pad.localPosition.y,
    };
  }

  private findNetForPad(_padId: string): string | null {
    return null;
  }
}
