import { Application, Container, Graphics } from 'pixi.js';
import type { Board, Component, TracePath, Point2D, MountingHole } from '@pcb/domain';
import {
  type ViewportState,
  type SelectionState,
  createViewport,
  createSelectionState,
  isSelected,
} from '@pcb/editor-core';
import { GridRenderer } from './grid-renderer';
import { BoardRenderer } from './board-renderer';
import { ComponentRenderer, type ComponentRenderOptions } from './component-renderer';
import { TraceRenderer, type TraceRenderOptions } from './trace-renderer';
import { SelectionRenderer } from './selection-renderer';
import { LayerRenderer, resolveLayerColor } from './layer-renderer';
import { InteractionManager } from './interaction';

export interface PCBCanvasOptions {
  /** The DOM element to mount the PixiJS canvas into */
  container: HTMLElement;
  /** Initial width (defaults to container width) */
  width?: number;
  /** Initial height (defaults to container height) */
  height?: number;
  /** Background color */
  background?: number;
}

/**
 * PCBCanvas is the top-level class that orchestrates the PixiJS application
 * and all sub-renderers for the PCB editor.
 */
export class PCBCanvas {
  private app: Application;
  private root: Container;
  private gridRenderer: GridRenderer;
  private boardRenderer: BoardRenderer;
  private componentRenderer: ComponentRenderer;
  private traceRenderer: TraceRenderer;
  private selectionRenderer: SelectionRenderer;
  private layerRenderer: LayerRenderer;
  private interactionManager: InteractionManager;

  // Layer containers in z-order
  private gridLayer: Container;
  private boardLayer: Container;
  private pcbLayersRoot: Container;
  private selectionOverlay: Container;
  private uiOverlay: Container;

  // State
  private viewport: ViewportState;
  private selection: SelectionState;
  private board: Board | null = null;
  private components: Component[] = [];
  private traces: TracePath[] = [];
  private mountingHoles: MountingHole[] = [];
  private ghostComponent: Component | null = null;
  private activeTracePoints: Point2D[] | null = null;
  private screenWidth: number;
  private screenHeight: number;
  private mounted = false;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.app = new Application();
    this.viewport = createViewport();
    this.selection = createSelectionState();
    this.screenWidth = 800;
    this.screenHeight = 600;

    // Scene graph
    this.root = new Container();
    this.root.label = 'root';

    this.gridLayer = new Container();
    this.gridLayer.label = 'grid-layer';

    this.boardLayer = new Container();
    this.boardLayer.label = 'board-layer';

    this.pcbLayersRoot = new Container();
    this.pcbLayersRoot.label = 'pcb-layers';

    this.selectionOverlay = new Container();
    this.selectionOverlay.label = 'selection-overlay';

    this.uiOverlay = new Container();
    this.uiOverlay.label = 'ui-overlay';

    this.root.addChild(this.gridLayer);
    this.root.addChild(this.boardLayer);
    this.root.addChild(this.pcbLayersRoot);
    this.root.addChild(this.selectionOverlay);
    this.root.addChild(this.uiOverlay);

    // Sub-renderers
    this.gridRenderer = new GridRenderer();
    this.gridLayer.addChild(this.gridRenderer.container);

    this.boardRenderer = new BoardRenderer();
    this.boardLayer.addChild(this.boardRenderer.container);

    this.componentRenderer = new ComponentRenderer();
    this.traceRenderer = new TraceRenderer();

    this.selectionRenderer = new SelectionRenderer();
    this.selectionOverlay.addChild(this.selectionRenderer.container);

    this.layerRenderer = new LayerRenderer(this.pcbLayersRoot);
    this.interactionManager = new InteractionManager(this.viewport);
  }

  /**
   * Initialize the PixiJS application and mount into the given container element.
   */
  async init(opts: PCBCanvasOptions): Promise<void> {
    const { container } = opts;
    this.screenWidth = opts.width ?? (container.clientWidth || 800);
    this.screenHeight = opts.height ?? (container.clientHeight || 600);

    await this.app.init({
      width: this.screenWidth,
      height: this.screenHeight,
      background: opts.background ?? 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Guard: if destroy() was called while init was awaiting, bail out
    if (this.destroyed) return;

    container.appendChild(this.app.canvas as HTMLCanvasElement);
    this.app.stage.addChild(this.root);
    this.mounted = true;

    // Interaction
    this.interactionManager.attach(this.app.canvas as HTMLCanvasElement);
    this.interactionManager.on('viewportchange', (e) => {
      if (e.viewport) {
        this.viewport = e.viewport;
        this.render();
      }
    });

    // Resize handling
    this.resizeObserver = new ResizeObserver((entries) => {
      if (!this.mounted) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) this.resize(width, height);
      }
    });
    this.resizeObserver.observe(container);
  }

  /** Resize the renderer */
  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.app.renderer.resize(width, height);
    this.render();
  }

  /** Update the viewport state and re-render */
  setViewport(viewport: ViewportState): void {
    this.viewport = viewport;
    this.interactionManager.updateViewport(viewport);
    this.render();
  }

  /** Update the selection state and re-render */
  setSelection(selection: SelectionState): void {
    this.selection = selection;
    this.render();
  }

  /** Set the active board (including layers) */
  setBoard(board: Board): void {
    this.board = board;
    // Ensure layer containers exist
    for (const layer of board.layers) {
      this.layerRenderer.getOrCreate(layer.id);
    }
    this.layerRenderer.applyLayerState(board.layers);
    this.render();
  }

  /** Set the components to render */
  setComponents(components: Component[]): void {
    this.components = components;
    this.render();
  }

  /** Set the trace paths to render */
  setTraces(traces: TracePath[]): void {
    this.traces = traces;
    this.render();
  }

  /** Set mounting holes to render */
  setMountingHoles(holes: MountingHole[]): void {
    this.mountingHoles = holes;
    this.render();
  }

  /** Set ghost component for placement preview */
  setGhostComponent(comp: Component | null): void {
    this.ghostComponent = comp;
    this.render();
  }

  /** Set active trace preview points */
  setActiveTracePoints(points: Point2D[] | null): void {
    this.activeTracePoints = points;
    this.render();
  }

  /** Access the interaction manager for event subscriptions */
  getInteractionManager(): InteractionManager {
    return this.interactionManager;
  }

  /** Access the UI overlay container for adding editor overlays */
  getUiOverlay(): Container {
    return this.uiOverlay;
  }

  /** Get current viewport state */
  getViewport(): ViewportState {
    return this.viewport;
  }

  /** Full re-render of the scene */
  render(): void {
    if (!this.mounted || this.destroyed || !this.app.renderer) return;

    // Grid
    if (this.board) {
      this.gridRenderer.render(
        this.viewport,
        this.board.workspace.grid,
        this.screenWidth,
        this.screenHeight,
      );
    }

    // Board outline
    if (this.board) {
      this.boardRenderer.render(this.board, this.viewport);
    }

    // Clear PCB layer containers
    for (const layer of this.board?.layers ?? []) {
      const c = this.layerRenderer.getContainer(layer.id);
      if (c) c.removeChildren();
    }

    // Components
    for (const comp of this.components) {
      const layerContainer = this.layerRenderer.getContainer(comp.layerId);
      if (!layerContainer) continue;

      const layerDef = this.board?.layers.find((l) => l.id === comp.layerId);
      const layerColor = layerDef ? resolveLayerColor(layerDef) : 0xcccccc;

      const opts: ComponentRenderOptions = {
        selected: isSelected(this.selection, comp.id),
        hovered: this.selection.hoveredId === comp.id,
        ghost: false,
        layerColor,
      };

      const graphic = this.componentRenderer.createComponentGraphic(comp, this.viewport, opts);
      layerContainer.addChild(graphic);

      // Silkscreen designator -- render on the matching silkscreen layer
      if (this.board) {
        const isTopLayer = layerDef && layerDef.order <= 2;
        const silkType = isTopLayer ? 'silkscreen_top' : 'silkscreen_bottom';
        const silkLayer = this.board.layers.find((l) => l.type === silkType);
        if (silkLayer) {
          const silkContainer = this.layerRenderer.getContainer(silkLayer.id);
          if (silkContainer) {
            const silkGraphic = this.componentRenderer.createSilkscreenDesignator(comp, this.viewport);
            if (silkGraphic) {
              silkContainer.addChild(silkGraphic);
            }
          }
        }
      }
    }

    // Mounting holes
    for (const hole of this.mountingHoles) {
      const layerContainer = this.layerRenderer.getContainer(hole.layerId);
      if (!layerContainer) continue;

      const gfx = new Graphics();
      const { zoom, x: vx, y: vy } = this.viewport;
      const cx = hole.position.x * zoom + vx;
      const cy = hole.position.y * zoom + vy;
      const outerR = (hole.diameter / 2) * zoom;
      const innerR = outerR * 0.6;

      // Outer ring
      if (hole.plated) {
        gfx.circle(cx, cy, Math.max(2, outerR)).fill({ color: 0xc0c0c0, alpha: 0.8 });
      } else {
        gfx.circle(cx, cy, Math.max(2, outerR)).stroke({ color: 0x808080, width: 2, alpha: 0.8 });
      }
      // Drill hole
      gfx.circle(cx, cy, Math.max(1, innerR)).fill({ color: 0x111111, alpha: 1 });

      // Crosshair
      const ch = outerR * 1.3;
      gfx.moveTo(cx - ch, cy).lineTo(cx + ch, cy).stroke({ color: 0x808080, width: 1, alpha: 0.5 });
      gfx.moveTo(cx, cy - ch).lineTo(cx, cy + ch).stroke({ color: 0x808080, width: 1, alpha: 0.5 });

      layerContainer.addChild(gfx);
    }

    // Traces
    for (const path of this.traces) {
      // Determine layer from first segment
      const firstSeg = path.segments[0];
      if (!firstSeg) continue;

      const layerContainer = this.layerRenderer.getContainer(firstSeg.layerId);
      if (!layerContainer) continue;

      const layerDef = this.board?.layers.find((l) => l.id === firstSeg.layerId);
      const layerColor = layerDef ? resolveLayerColor(layerDef) : 0xcccccc;

      const opts: TraceRenderOptions = {
        layerColor,
        selected: isSelected(this.selection, path.id),
        debugHighlight: path.debugLinks.length > 0,
      };

      const graphic = this.traceRenderer.createTraceGraphic(path, this.viewport, opts);
      layerContainer.addChild(graphic);
    }

    // Ghost component (placement preview)
    if (this.ghostComponent) {
      const layerDef = this.board?.layers.find((l) => l.id === this.ghostComponent!.layerId);
      const layerColor = layerDef ? resolveLayerColor(layerDef) : 0xcccccc;
      const ghostOpts: ComponentRenderOptions = {
        selected: false,
        hovered: false,
        ghost: true,
        layerColor,
      };
      const ghostGraphic = this.componentRenderer.createComponentGraphic(
        this.ghostComponent, this.viewport, ghostOpts,
      );
      this.uiOverlay.removeChildren();
      this.uiOverlay.addChild(ghostGraphic);
    } else {
      this.uiOverlay.removeChildren();
    }

    // Active trace preview
    if (this.activeTracePoints && this.activeTracePoints.length >= 2) {
      const gfx = new Graphics();
      const pts = this.activeTracePoints;
      const { zoom, x: vx, y: vy } = this.viewport;
      gfx.moveTo(pts[0].x * zoom + vx, pts[0].y * zoom + vy);
      for (let i = 1; i < pts.length; i++) {
        gfx.lineTo(pts[i].x * zoom + vx, pts[i].y * zoom + vy);
      }
      gfx.stroke({ color: 0x00ff88, width: 2, alpha: 0.7 });
      for (const p of pts) {
        gfx.circle(p.x * zoom + vx, p.y * zoom + vy, 3).fill({ color: 0x00ff88, alpha: 0.9 });
      }
      this.uiOverlay.addChild(gfx);
    }

    // Selection overlay
    this.selectionRenderer.clear();
  }

  /** Destroy the application and clean up */
  destroy(): void {
    this.mounted = false;
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    try { this.interactionManager.detach(); } catch { /* ok */ }
    try { this.gridRenderer.destroy(); } catch { /* ok */ }
    try { this.boardRenderer.destroy(); } catch { /* ok */ }
    try { this.selectionRenderer.destroy(); } catch { /* ok */ }
    try { this.layerRenderer.clear(); } catch { /* ok */ }
    // Remove the canvas element manually before destroy to avoid PixiJS DOM errors
    try {
      const canvasEl = this.app.canvas as HTMLCanvasElement;
      if (canvasEl?.parentNode) canvasEl.parentNode.removeChild(canvasEl);
    } catch { /* ok */ }
    try {
      this.app.destroy(false);
    } catch {
      // PixiJS v8 may throw if Application wasn't fully initialized
    }
  }
}
