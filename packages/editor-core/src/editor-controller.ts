import type { Point2D, Component, TracePath, MountingHole, Rotation, GridConfig, LayerId, BoardLayer } from '@pcb/domain';
import { normalizeRotation, createId } from '@pcb/domain';
import { EditorTool } from './tools';
import type { PointerEvent2D, KeyEvent, ToolContext, ToolResult } from './tools';
import type { ToolHandler, ToolOperations, MeasurementOverlay } from './tools/tool-handler';
import { createTool } from './tools/index';
import type { PlaceTool } from './tools/place-tool';
import type { Command } from './commands/types';
import { MoveCommand } from './commands/move-command';
import { DeleteCommand } from './commands/delete-command';
import { RotateCommand } from './commands/rotate-command';
import { PlaceCommand } from './commands/place-command';
import { UndoStack } from './history';
import type { SelectionState, MarqueeState } from './selection';
import {
  createSelectionState,
  clearSelection,
  getSelectedIds,
  selectAll,
} from './selection';
import type { ViewportState } from './viewport';
import { createViewport } from './viewport';

export interface EditorState {
  activeTool: EditorTool;
  selection: SelectionState;
  viewport: ViewportState;
  components: Component[];
  traces: TracePath[];
  canUndo: boolean;
  canRedo: boolean;
  ghostComponent: Component | null;
  activeTracePoints: Point2D[] | null;
  marquee: MarqueeState | null;
  measurement: MeasurementOverlay | null;
  cursor: string;
}

export type EditorStateListener = (state: EditorState) => void;

/**
 * Central editor controller. Ties tools, commands, undo/redo, and board state
 * together. Framework-agnostic -- communicates changes through the
 * onStateChange callback.
 */
export class EditorController {
  private activeTool: ToolHandler;
  private activeToolType: EditorTool = EditorTool.Select;
  private commandHistory = new UndoStack<Command>(100);

  // Board data (mutable references -- owned externally, mutated by commands)
  private components: Component[] = [];
  private traces: TracePath[] = [];
  private mountingHoles: MountingHole[] = [];

  // Editor state
  private selection: SelectionState = createSelectionState();
  private viewport: ViewportState = createViewport();
  private gridConfig: GridConfig = { spacingX: 5, spacingY: 5, subdivisions: 2, visible: true, snapEnabled: true };
  private activeLayerId: LayerId = '' as LayerId;
  private layers: BoardLayer[] = [];
  private traceWidth = 10;
  private traceCornerRadius = 0;

  // Overlay state
  private ghostComponent: Component | null = null;
  private activeTracePoints: Point2D[] | null = null;
  private marquee: MarqueeState | null = null;
  private measurement: MeasurementOverlay | null = null;
  private cursor = 'default';

  // Listener
  onStateChange?: EditorStateListener;

  private ops: ToolOperations;

  constructor() {
    this.activeTool = createTool(EditorTool.Select);
    this.ops = this.createOps();
  }

  // ------- Tool management -------

  setActiveTool(tool: EditorTool): void {
    this.activeTool.deactivate(this.ops);
    this.activeToolType = tool;
    this.activeTool = createTool(tool);
    this.activeTool.activate(this.getToolContext(), this.ops);
    this.emitState();
  }

  getActiveTool(): ToolHandler {
    return this.activeTool;
  }

  getActiveToolType(): EditorTool {
    return this.activeToolType;
  }

  /**
   * For the place tool: set the component template to place.
   */
  setPlacementTemplate(component: Component): void {
    if (this.activeToolType !== EditorTool.Place) {
      this.setActiveTool(EditorTool.Place);
    }
    (this.activeTool as PlaceTool).setTemplate(component);
    this.activeTool.activate(this.getToolContext(), this.ops);
    this.emitState();
  }

  // ------- Command / history -------

  executeCommand(command: Command, skipExecute = false): void {
    if (!skipExecute) {
      command.execute();
    }
    this.commandHistory.push({
      action: command.label,
      before: command,
      after: command,
      timestamp: Date.now(),
    });
    this.emitState();
  }

  undo(): void {
    const entry = this.commandHistory.undo();
    if (entry) {
      (entry.before as Command).undo();
      this.emitState();
    }
  }

  redo(): void {
    const entry = this.commandHistory.redo();
    if (entry) {
      (entry.after as Command).execute();
      this.emitState();
    }
  }

  canUndo(): boolean {
    return this.commandHistory.canUndo();
  }

  canRedo(): boolean {
    return this.commandHistory.canRedo();
  }

  // ------- Component operations -------

  setComponents(components: Component[]): void {
    this.components = components;
  }

  getComponents(): Component[] {
    return this.components;
  }

  addComponent(component: Component): void {
    this.components.push(component);
  }

  removeComponent(id: string): void {
    this.components = this.components.filter((c) => c.id !== id);
  }

  moveComponents(ids: string[], newPositions: Point2D[]): void {
    const comps: Component[] = [];
    const oldPos = new Map<string, Point2D>();
    const newPos = new Map<string, Point2D>();

    for (let i = 0; i < ids.length; i++) {
      const comp = this.components.find((c) => c.id === ids[i]);
      if (comp) {
        comps.push(comp);
        oldPos.set(ids[i], { ...comp.transform.position });
        newPos.set(ids[i], newPositions[i]);
      }
    }

    const cmd = new MoveCommand({ components: comps, oldPositions: oldPos, newPositions: newPos });
    cmd.execute();
    this.executeCommand(cmd, true);
  }

  rotateComponents(ids: string[], degrees: number): void {
    const comps: Component[] = [];
    const oldRots = new Map<string, Rotation>();
    const newRots = new Map<string, Rotation>();

    for (const id of ids) {
      const comp = this.components.find((c) => c.id === id);
      if (comp) {
        comps.push(comp);
        oldRots.set(id, comp.transform.rotation);
        newRots.set(id, normalizeRotation(comp.transform.rotation + degrees));
      }
    }

    const cmd = new RotateCommand({ components: comps, oldRotations: oldRots, newRotations: newRots });
    cmd.execute();
    this.executeCommand(cmd, true);
  }

  deleteComponents(ids: string[]): void {
    const comps = ids
      .map((id) => this.components.find((c) => c.id === id))
      .filter((c): c is Component => c !== undefined)
      .map((c) => structuredClone(c));

    if (comps.length === 0) return;

    const cmd = new DeleteCommand({
      components: comps,
      addComponent: (comp) => this.addComponent(comp),
      removeComponent: (id) => this.removeComponent(id),
    });
    cmd.execute();
    this.executeCommand(cmd, true);
    this.selection = clearSelection(this.selection);
    this.emitState();
  }

  duplicateComponents(ids: string[]): void {
    for (const id of ids) {
      const comp = this.components.find((c) => c.id === id);
      if (!comp) continue;

      const clone: Component = {
        ...structuredClone(comp),
        id: createId('comp'),
        designator: comp.designator + '_copy',
        transform: {
          ...comp.transform,
          position: {
            x: comp.transform.position.x + 100,
            y: comp.transform.position.y + 100,
          },
        },
      };

      const cmd = new PlaceCommand({
        component: clone,
        addComponent: (c) => this.addComponent(c),
        removeComponent: (cid) => this.removeComponent(cid),
      });
      cmd.execute();
      this.executeCommand(cmd, true);
    }

    this.emitState();
  }

  // ------- Trace operations -------

  setTraces(traces: TracePath[]): void {
    this.traces = traces;
  }

  getTraces(): TracePath[] {
    return this.traces;
  }

  addTrace(trace: TracePath): void {
    this.traces.push(trace);
  }

  removeTrace(id: string): void {
    this.traces = this.traces.filter((t) => t.id !== id);
  }

  // ------- Mounting hole operations -------

  setMountingHoles(holes: MountingHole[]): void {
    this.mountingHoles = holes;
  }

  getMountingHoles(): MountingHole[] {
    return this.mountingHoles;
  }

  addMountingHole(hole: MountingHole): void {
    this.mountingHoles.push(hole);
    this.emitState();
  }

  removeMountingHole(id: string): void {
    this.mountingHoles = this.mountingHoles.filter((h) => h.id !== id);
    this.emitState();
  }

  // ------- State access -------

  getSelection(): SelectionState {
    return this.selection;
  }

  setSelection(selection: SelectionState): void {
    this.selection = selection;
    this.emitState();
  }

  getViewport(): ViewportState {
    return this.viewport;
  }

  setViewport(viewport: ViewportState): void {
    this.viewport = viewport;
  }

  setGridConfig(config: GridConfig): void {
    this.gridConfig = config;
  }

  setActiveLayerId(id: LayerId): void {
    this.activeLayerId = id;
  }

  setLayers(layers: BoardLayer[]): void {
    this.layers = layers;
  }

  setTraceWidth(width: number): void {
    this.traceWidth = width;
  }

  getTraceWidth(): number {
    return this.traceWidth;
  }

  setTraceCornerRadius(radius: number): void {
    this.traceCornerRadius = Math.max(0, radius);
  }

  getTraceCornerRadius(): number {
    return this.traceCornerRadius;
  }

  getState(): EditorState {
    return {
      activeTool: this.activeToolType,
      selection: this.selection,
      viewport: this.viewport,
      components: this.components,
      traces: this.traces,
      canUndo: this.commandHistory.canUndo(),
      canRedo: this.commandHistory.canRedo(),
      ghostComponent: this.ghostComponent,
      activeTracePoints: this.activeTracePoints,
      marquee: this.marquee,
      measurement: this.measurement,
      cursor: this.cursor,
    };
  }

  // ------- Event forwarding from InteractionManager -------

  handlePointerDown(event: PointerEvent2D): void {
    const result = this.activeTool.onPointerDown(event, this.getToolContext(), this.ops);
    this.applyResult(result);
  }

  handlePointerMove(event: PointerEvent2D): void {
    const result = this.activeTool.onPointerMove(event, this.getToolContext(), this.ops);
    this.applyResult(result);
  }

  handlePointerUp(event: PointerEvent2D): void {
    const result = this.activeTool.onPointerUp(event, this.getToolContext(), this.ops);
    this.applyResult(result);
  }

  handleDoubleClick(event: PointerEvent2D): void {
    const result = this.activeTool.onDoubleClick(event, this.getToolContext(), this.ops);
    this.applyResult(result);
  }

  handleKeyDown(event: KeyEvent): void {
    const result = this.activeTool.onKeyDown(event, this.getToolContext(), this.ops);
    this.applyResult(result);
  }

  // ------- Internals -------

  private getToolContext(): ToolContext {
    return {
      viewport: this.viewport,
      selection: this.selection,
      gridConfig: this.gridConfig,
      activeLayerId: this.activeLayerId,
      traceWidth: this.traceWidth,
      traceCornerRadius: this.traceCornerRadius,
      layers: this.layers,
    };
  }

  private applyResult(result: ToolResult): void {
    let changed = false;

    if (result.viewport) {
      this.viewport = { ...this.viewport, ...result.viewport };
      changed = true;
    }

    if (result.selection) {
      this.selection = { ...this.selection, ...result.selection } as SelectionState;
      // Ensure selectedIds is a Set
      if (result.selection.selectedIds) {
        this.selection.selectedIds = result.selection.selectedIds instanceof Set
          ? result.selection.selectedIds
          : new Set(result.selection.selectedIds as any);
      }
      changed = true;
    }

    if (result.cursor) {
      this.cursor = result.cursor;
      changed = true;
    }

    if (result.dirty || changed) {
      this.emitState();
    }
  }

  private emitState(): void {
    this.onStateChange?.(this.getState());
  }

  private createOps(): ToolOperations {
    return {
      getComponents: () => this.components,
      getComponentById: (id) => this.components.find((c) => c.id === id),
      getComponentsInRect: (min, max) =>
        this.components.filter((c) => {
          const pos = c.transform.position;
          const bb = c.footprint.boundingBox;
          const cMinX = pos.x + bb.min.x;
          const cMaxX = pos.x + bb.max.x;
          const cMinY = pos.y + bb.min.y;
          const cMaxY = pos.y + bb.max.y;
          return cMinX <= max.x && cMaxX >= min.x && cMinY <= max.y && cMaxY >= min.y;
        }),

      getTraces: () => this.traces,

      executeCommand: (cmd) => this.executeCommand(cmd),

      addComponent: (comp) => this.addComponent(comp),
      removeComponent: (id) => this.removeComponent(id),
      addTrace: (trace) => this.addTrace(trace),
      removeTrace: (id) => this.removeTrace(id),

      requestRender: () => this.emitState(),
      setCursor: (cursor) => {
        this.cursor = cursor;
      },

      setGhostComponent: (comp) => {
        this.ghostComponent = comp;
      },
      setActiveTrace: (points) => {
        this.activeTracePoints = points;
      },
      setMarquee: (marquee) => {
        this.marquee = marquee;
      },
      setMeasurement: (measurement) => {
        this.measurement = measurement;
      },
    };
  }
}
