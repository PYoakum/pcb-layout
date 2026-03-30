import type { Point2D, TracePath, TraceSegment, Via, Pad, Component, LayerId } from '@pcb/domain';
import { createId } from '@pcb/domain';
import type { PointerEvent2D, KeyEvent, ToolContext, ToolResult } from '../tools';
import type { ToolHandler, ToolOperations } from './tool-handler';
import { NOOP_RESULT, dirtyResult } from './tool-handler';
import { snapToGrid } from '../snap';

const PAD_SNAP_THRESHOLD = 10; // mils — must click very close to pad center to snap
const DEFAULT_VIA_OUTER = 30;  // mils
const DEFAULT_VIA_DRILL = 15;  // mils

export class TraceTool implements ToolHandler {
  readonly name = 'trace';

  private waypoints: Point2D[] = [];
  private waypointLayers: LayerId[] = [];
  private vias: Via[] = [];
  private cursorPoint: Point2D = { x: 0, y: 0 };
  private startPadId: string | null = null;
  private netId: string | null = null;
  private active = false;
  private currentLayerId: LayerId | null = null;

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
      this.currentLayerId = ctx.activeLayerId;
      this.waypointLayers = [this.currentLayerId];
      this.vias = [];
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
      this.waypointLayers.push(this.currentLayerId!);
      this.commitTrace(ctx, ops);
      return dirtyResult();
    }

    // Otherwise add a freehand waypoint on grid
    this.waypoints.push(gridPoint);
    this.waypointLayers.push(this.currentLayerId!);
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
    this.waypointLayers.push(this.currentLayerId!);
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
      this.waypointLayers.pop();
      // Remove any via at the popped waypoint
      const lastPt = this.waypoints[this.waypoints.length - 1];
      this.vias = this.vias.filter(
        (v) => !(v.position.x === lastPt.x && v.position.y === lastPt.y),
      );
      // Restore layer to whatever the last waypoint was on
      this.currentLayerId = this.waypointLayers[this.waypointLayers.length - 1];
      this.updatePreview(ops);
      return dirtyResult();
    }

    // V key: insert via and switch layer
    if ((event.key === 'v' || event.key === 'V') && this.active) {
      return this.insertVia(ctx, ops);
    }

    return NOOP_RESULT;
  }

  /**
   * Insert a via at the current cursor position and switch to the next signal layer.
   */
  private insertVia(ctx: ToolContext, ops: ToolOperations): ToolResult {
    const signalLayers = ctx.layers.filter((l) => l.type === 'signal');
    if (signalLayers.length < 2) return NOOP_RESULT;

    const fromLayerId = this.currentLayerId!;
    const currentIdx = signalLayers.findIndex((l) => l.id === fromLayerId);
    const nextIdx = (currentIdx + 1) % signalLayers.length;
    const toLayerId = signalLayers[nextIdx].id;

    const gridPoint = snapToGrid(this.cursorPoint, ctx.gridConfig).point;

    // Add the current point as a waypoint (end of segment on current layer)
    this.waypoints.push(gridPoint);
    this.waypointLayers.push(fromLayerId);

    // Create the via
    const via: Via = {
      id: createId('via'),
      pathId: '' as any, // will be set on commit
      position: { ...gridPoint },
      fromLayerId,
      toLayerId,
      outerDiameter: DEFAULT_VIA_OUTER,
      drillDiameter: DEFAULT_VIA_DRILL,
      netId: (this.netId ?? '') as any,
    };
    this.vias.push(via);

    // Switch layer and add a new waypoint on the new layer at the same position
    this.currentLayerId = toLayerId;
    this.waypoints.push(gridPoint);
    this.waypointLayers.push(toLayerId);

    this.updatePreview(ops);
    return dirtyResult();
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
      // Skip zero-length segments (via insertion creates two waypoints at same position)
      const dx = this.waypoints[i + 1].x - this.waypoints[i].x;
      const dy = this.waypoints[i + 1].y - this.waypoints[i].y;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) continue;

      segments.push({
        id: createId('seg'),
        pathId,
        layerId: this.waypointLayers[i],
        start: { ...this.waypoints[i] },
        end: { ...this.waypoints[i + 1] },
        width: ctx.traceWidth,
      });
    }

    // Patch via pathIds
    for (const via of this.vias) {
      via.pathId = pathId;
    }

    const tracePath: TracePath = {
      id: pathId,
      netId: (this.netId ?? createId('net')) as any,
      segments,
      vias: this.vias,
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
    this.waypointLayers = [];
    this.vias = [];
    this.active = false;
    this.startPadId = null;
    this.netId = null;
    this.currentLayerId = null;
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
