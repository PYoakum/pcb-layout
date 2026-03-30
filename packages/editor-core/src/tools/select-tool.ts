import type { Point2D, Component, Rotation } from '@pcb/domain';
import { normalizeRotation } from '@pcb/domain';
import type { PointerEvent2D, KeyEvent, ToolContext, ToolResult } from '../tools';
import type { ToolHandler, ToolOperations } from './tool-handler';
import { NOOP_RESULT, dirtyResult } from './tool-handler';
import { MoveCommand } from '../commands/move-command';
import { DeleteCommand } from '../commands/delete-command';
import { RotateCommand } from '../commands/rotate-command';
import { snapToGrid } from '../snap';
import {
  select,
  deselect,
  toggleSelect,
  clearSelection,
  selectAll,
  getSelectedIds,
  createMarquee,
  updateMarquee,
  getMarqueeBounds,
} from '../selection';

type DragMode = 'none' | 'move' | 'marquee';

export class SelectTool implements ToolHandler {
  readonly name = 'select';

  private dragMode: DragMode = 'none';
  private dragStartWorld: Point2D = { x: 0, y: 0 };
  private dragOffsets: Map<string, Point2D> = new Map();
  private dragStartPositions: Map<string, Point2D> = new Map();
  private hasDragged = false;

  activate(_ctx: ToolContext, ops: ToolOperations): void {
    ops.setCursor('default');
  }

  deactivate(ops: ToolOperations): void {
    this.resetDrag();
    ops.setMarquee(null);
  }

  onPointerDown(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (event.button !== 0) return NOOP_RESULT;

    const wp = event.worldPoint;
    const hitComp = this.hitTest(wp, ops);

    if (hitComp) {
      // Shift+click toggles selection
      if (event.shiftKey) {
        const sel = toggleSelect(ctx.selection, hitComp.id);
        return dirtyResult({ selection: sel });
      }

      // If clicking a non-selected component, select it exclusively
      let sel = ctx.selection;
      if (!ctx.selection.selectedIds.has(hitComp.id)) {
        sel = select(clearSelection(ctx.selection), hitComp.id);
      }

      // Start move drag
      this.dragMode = 'move';
      this.dragStartWorld = { ...wp };
      this.hasDragged = false;
      this.dragOffsets.clear();
      this.dragStartPositions.clear();

      const selectedIds = getSelectedIds(sel);
      for (const id of selectedIds) {
        const comp = ops.getComponentById(id);
        if (comp) {
          this.dragOffsets.set(id, {
            x: wp.x - comp.transform.position.x,
            y: wp.y - comp.transform.position.y,
          });
          this.dragStartPositions.set(id, { ...comp.transform.position });
        }
      }

      return dirtyResult({ selection: sel, cursor: 'grabbing' });
    }

    // Click on empty space -- start marquee or deselect
    if (!event.shiftKey) {
      this.dragMode = 'marquee';
      this.dragStartWorld = { ...wp };
      this.hasDragged = false;
      ops.setMarquee(createMarquee(wp));
      return dirtyResult({ selection: clearSelection(ctx.selection) });
    }

    return NOOP_RESULT;
  }

  onPointerMove(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    const wp = event.worldPoint;

    if (this.dragMode === 'move') {
      this.hasDragged = true;
      const selectedIds = getSelectedIds(ctx.selection);

      for (const id of selectedIds) {
        const comp = ops.getComponentById(id);
        const offset = this.dragOffsets.get(id);
        if (!comp || !offset) continue;

        const rawPos: Point2D = {
          x: wp.x - offset.x,
          y: wp.y - offset.y,
        };

        const snapped = snapToGrid(rawPos, ctx.gridConfig);
        comp.transform.position = snapped.point;
      }

      return dirtyResult({ cursor: 'grabbing' });
    }

    if (this.dragMode === 'marquee') {
      this.hasDragged = true;
      ops.setMarquee(updateMarquee(createMarquee(this.dragStartWorld), wp));
      return dirtyResult();
    }

    // Hover detection
    const hitComp = this.hitTest(wp, ops);
    const newHoveredId = hitComp?.id ?? null;
    if (newHoveredId !== ctx.selection.hoveredId) {
      return dirtyResult({
        selection: { ...ctx.selection, hoveredId: newHoveredId },
        cursor: hitComp ? 'pointer' : 'default',
      });
    }

    return NOOP_RESULT;
  }

  onPointerUp(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (this.dragMode === 'move' && this.hasDragged) {
      // Create move command with before/after positions
      const selectedIds = getSelectedIds(ctx.selection);
      const components: Component[] = [];
      const oldPositions = new Map<string, Point2D>();
      const newPositions = new Map<string, Point2D>();

      for (const id of selectedIds) {
        const comp = ops.getComponentById(id);
        const startPos = this.dragStartPositions.get(id);
        if (comp && startPos) {
          components.push(comp);
          oldPositions.set(id, startPos);
          newPositions.set(id, { ...comp.transform.position });
        }
      }

      if (components.length > 0) {
        const cmd = new MoveCommand({ components, oldPositions, newPositions });
        // Don't execute -- positions are already set during drag. Just record for undo.
        ops.executeCommand(cmd);
      }

      this.resetDrag();
      return dirtyResult({ cursor: 'default' });
    }

    if (this.dragMode === 'marquee' && this.hasDragged) {
      // Select all components within marquee bounds
      const marq = createMarquee(this.dragStartWorld);
      const updatedMarquee = updateMarquee(marq, event.worldPoint);
      const bounds = getMarqueeBounds(updatedMarquee);
      const hits = ops.getComponentsInRect(bounds.min, bounds.max);
      const hitIds = hits.map((c) => c.id);
      ops.setMarquee(null);
      this.resetDrag();
      return dirtyResult({ selection: selectAll(ctx.selection, hitIds) });
    }

    ops.setMarquee(null);
    this.resetDrag();
    return dirtyResult({ cursor: 'default' });
  }

  onDoubleClick(_event: PointerEvent2D, _ctx: ToolContext, _ops: ToolOperations): ToolResult {
    // Double-click could open a properties panel; for now just signal via result
    return NOOP_RESULT;
  }

  onKeyDown(event: KeyEvent, ctx: ToolContext, ops: ToolOperations): ToolResult {
    const selectedIds = getSelectedIds(ctx.selection);

    // Delete / Backspace: delete selected components
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length > 0) {
      const components = selectedIds
        .map((id) => ops.getComponentById(id))
        .filter((c): c is Component => c !== undefined);

      if (components.length > 0) {
        const cmd = new DeleteCommand({
          components: components.map((c) => structuredClone(c)),
          addComponent: (comp) => ops.addComponent(comp),
          removeComponent: (id) => ops.removeComponent(id),
        });
        ops.executeCommand(cmd);
      }

      return dirtyResult({ selection: clearSelection(ctx.selection) });
    }

    // R: rotate selected 90 degrees
    if (event.key === 'r' || event.key === 'R') {
      if (selectedIds.length > 0) {
        const components: Component[] = [];
        const oldRotations = new Map<string, Rotation>();
        const newRotations = new Map<string, Rotation>();

        for (const id of selectedIds) {
          const comp = ops.getComponentById(id);
          if (comp) {
            components.push(comp);
            oldRotations.set(id, comp.transform.rotation);
            newRotations.set(id, normalizeRotation(comp.transform.rotation + 90));
          }
        }

        if (components.length > 0) {
          const cmd = new RotateCommand({ components, oldRotations, newRotations });
          ops.executeCommand(cmd);
        }
        return dirtyResult();
      }
    }

    // Ctrl+A: select all
    if (event.key === 'a' && event.ctrlKey) {
      const allIds = ops.getComponents().map((c) => c.id);
      return dirtyResult({ selection: selectAll(ctx.selection, allIds) });
    }

    // Escape: deselect
    if (event.key === 'Escape') {
      return dirtyResult({ selection: clearSelection(ctx.selection) });
    }

    return NOOP_RESULT;
  }

  private resetDrag(): void {
    this.dragMode = 'none';
    this.hasDragged = false;
    this.dragOffsets.clear();
    this.dragStartPositions.clear();
  }

  private hitTest(worldPoint: Point2D, ops: ToolOperations): Component | undefined {
    const components = ops.getComponents();
    // Iterate in reverse so topmost (last drawn) is checked first
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      if (comp.locked) continue;
      const pos = comp.transform.position;
      const bb = comp.footprint.boundingBox;
      const minX = pos.x + bb.min.x;
      const maxX = pos.x + bb.max.x;
      const minY = pos.y + bb.min.y;
      const maxY = pos.y + bb.max.y;

      if (
        worldPoint.x >= minX && worldPoint.x <= maxX &&
        worldPoint.y >= minY && worldPoint.y <= maxY
      ) {
        return comp;
      }
    }
    return undefined;
  }
}
