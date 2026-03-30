import type { Component, Rotation } from '@pcb/domain';
import { normalizeRotation, createId } from '@pcb/domain';
import type { PointerEvent2D, KeyEvent, ToolContext, ToolResult } from '../tools';
import type { ToolHandler, ToolOperations } from './tool-handler';
import { NOOP_RESULT, dirtyResult } from './tool-handler';
import { PlaceCommand } from '../commands/place-command';
import { snapToGrid } from '../snap';

export class PlaceTool implements ToolHandler {
  readonly name = 'place';

  /** Template component to clone for each placement */
  private template: Component | null = null;
  /** Current ghost rotation */
  private ghostRotation: Rotation = 0 as Rotation;
  /** Designator counter for auto-incrementing */
  private designatorCounter = 1;

  activate(_ctx: ToolContext, ops: ToolOperations): void {
    ops.setCursor('crosshair');
    if (this.template) {
      this.updateGhost(ops, { x: 0, y: 0 });
    }
  }

  deactivate(ops: ToolOperations): void {
    ops.setGhostComponent(null);
    this.template = null;
  }

  /**
   * Set the component template for placement. Must be called before the tool
   * can function.
   */
  setTemplate(component: Component): void {
    this.template = component;
    this.ghostRotation = component.transform.rotation;
    // Extract numeric suffix from designator to start counter
    const match = component.designator.match(/(\d+)$/);
    this.designatorCounter = match ? parseInt(match[1], 10) : 1;
  }

  onPointerDown(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (event.button !== 0 || !this.template) return NOOP_RESULT;

    const snapped = snapToGrid(event.worldPoint, ctx.gridConfig);

    // Clone the template with a new id and position
    const newComp = this.cloneTemplate(snapped.point);

    const cmd = new PlaceCommand({
      component: newComp,
      addComponent: (comp) => ops.addComponent(comp),
      removeComponent: (id) => ops.removeComponent(id),
    });
    ops.executeCommand(cmd);

    this.designatorCounter++;

    // Stay in place mode -- update ghost for next placement
    this.updateGhost(ops, snapped.point);

    return dirtyResult();
  }

  onPointerMove(event: PointerEvent2D, ctx: ToolContext, ops: ToolOperations): ToolResult {
    if (!this.template) return NOOP_RESULT;

    const snapped = snapToGrid(event.worldPoint, ctx.gridConfig);
    this.updateGhost(ops, snapped.point);

    return dirtyResult();
  }

  onPointerUp(_event: PointerEvent2D, _ctx: ToolContext, _ops: ToolOperations): ToolResult {
    return NOOP_RESULT;
  }

  onDoubleClick(_event: PointerEvent2D, _ctx: ToolContext, _ops: ToolOperations): ToolResult {
    return NOOP_RESULT;
  }

  onKeyDown(event: KeyEvent, _ctx: ToolContext, ops: ToolOperations): ToolResult {
    // R: rotate ghost 90 degrees
    if (event.key === 'r' || event.key === 'R') {
      this.ghostRotation = normalizeRotation(this.ghostRotation + 90);
      if (this.template) {
        // Re-emit current ghost with new rotation
        ops.setGhostComponent(this.createGhostComponent({ x: 0, y: 0 }));
      }
      return dirtyResult();
    }

    // Escape: cancel placement
    if (event.key === 'Escape') {
      ops.setGhostComponent(null);
      this.template = null;
      return dirtyResult();
    }

    return NOOP_RESULT;
  }

  private updateGhost(ops: ToolOperations, position: { x: number; y: number }): void {
    ops.setGhostComponent(this.createGhostComponent(position));
  }

  private createGhostComponent(position: { x: number; y: number }): Component | null {
    if (!this.template) return null;

    return {
      ...this.template,
      id: '__ghost__' as any,
      designator: this.nextDesignator(),
      transform: {
        ...this.template.transform,
        position: { ...position },
        rotation: this.ghostRotation,
      },
    };
  }

  private cloneTemplate(position: { x: number; y: number }): Component {
    const t = this.template!;
    return {
      ...structuredClone(t),
      id: createId('comp'),
      designator: this.nextDesignator(),
      transform: {
        ...t.transform,
        position: { ...position },
        rotation: this.ghostRotation,
      },
    };
  }

  private nextDesignator(): string {
    if (!this.template) return `X${this.designatorCounter}`;
    const prefix = this.template.designator.replace(/\d+$/, '');
    return `${prefix}${this.designatorCounter}`;
  }
}
