import type { StateCreator } from 'zustand';
import type { LayerId, Component, TracePath, Point2D } from '@pcb/domain';
import type { LibraryComponent } from '../data/default-components';

export type EditorTool = 'select' | 'place' | 'trace' | 'pan' | 'measure';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface MeasurementDisplay {
  start: Point2D;
  end: Point2D;
  distanceMils: number;
  distanceMm: number;
}

export interface EditorSlice {
  activeTool: EditorTool;
  selectedIds: string[];
  hoveredId: string | null;
  viewport: Viewport;
  gridVisible: boolean;
  snapEnabled: boolean;
  activeLayerId: LayerId | null;

  // Board data managed by the editor
  components: Component[];
  traces: TracePath[];

  // Undo/redo availability (mirrors controller state for UI)
  canUndo: boolean;
  canRedo: boolean;

  // Placement
  placementTemplate: LibraryComponent | null;

  // Trace width (mils)
  traceWidth: number;

  // Cursor world position
  cursorWorldPosition: Point2D;

  // Overlay state
  ghostComponent: Component | null;
  activeTracePoints: Point2D[] | null;
  measurement: MeasurementDisplay | null;
  cursor: string;

  // Tool actions
  setActiveTool: (tool: EditorTool) => void;
  startPlacement: (template: LibraryComponent) => void;
  cancelPlacement: () => void;
  setTraceWidth: (width: number) => void;
  setSelectedIds: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  setHoveredId: (id: string | null) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setActiveLayerId: (id: LayerId | null) => void;

  // Component mutations
  setComponents: (components: Component[]) => void;
  addComponent: (component: Component) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  moveComponents: (ids: string[], positions: Point2D[]) => void;
  rotateComponents: (ids: string[], rotation: number) => void;

  // Trace mutations
  setTraces: (traces: TracePath[]) => void;
  addTrace: (trace: TracePath) => void;
  removeTrace: (id: string) => void;

  // Undo/redo state
  setCanUndo: (value: boolean) => void;
  setCanRedo: (value: boolean) => void;

  // Overlay state
  setGhostComponent: (component: Component | null) => void;
  setActiveTracePoints: (points: Point2D[] | null) => void;
  setMeasurement: (measurement: MeasurementDisplay | null) => void;
  setCursorWorldPosition: (pos: Point2D) => void;
  setCursor: (cursor: string) => void;
}

export const createEditorSlice: StateCreator<EditorSlice> = (set) => ({
  activeTool: 'select',
  selectedIds: [],
  hoveredId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  gridVisible: true,
  snapEnabled: true,
  activeLayerId: null,

  components: [],
  traces: [],

  canUndo: false,
  canRedo: false,

  placementTemplate: null,

  traceWidth: 10,

  cursorWorldPosition: { x: 0, y: 0 },

  ghostComponent: null,
  activeTracePoints: null,
  measurement: null,
  cursor: 'default',

  setActiveTool: (tool) => set({ activeTool: tool }),

  startPlacement: (template) => set({ placementTemplate: template, activeTool: 'place' }),

  cancelPlacement: () => set({ placementTemplate: null, activeTool: 'select' }),

  setTraceWidth: (width) => set({ traceWidth: Math.max(1, width) }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  addToSelection: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds
        : [...state.selectedIds, id],
    })),

  removeFromSelection: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    })),

  clearSelection: () => set({ selectedIds: [], hoveredId: null }),

  setHoveredId: (id) => set({ hoveredId: id }),

  setViewport: (viewport) =>
    set((state) => ({ viewport: { ...state.viewport, ...viewport } })),

  zoomIn: () =>
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.min(state.viewport.zoom * 1.25, 32) },
    })),

  zoomOut: () =>
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.max(state.viewport.zoom / 1.25, 0.05) },
    })),

  resetZoom: () =>
    set((state) => ({ viewport: { ...state.viewport, zoom: 1, x: 0, y: 0 } })),

  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),

  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),

  setActiveLayerId: (id) => set({ activeLayerId: id }),

  // Component mutations
  setComponents: (components) => set({ components }),

  addComponent: (component) =>
    set((state) => ({ components: [...state.components, component] })),

  removeComponent: (id) =>
    set((state) => ({ components: state.components.filter((c) => c.id !== id) })),

  updateComponent: (id, updates) =>
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),

  moveComponents: (ids, positions) =>
    set((state) => ({
      components: state.components.map((c) => {
        const idx = ids.indexOf(c.id);
        if (idx === -1) return c;
        return {
          ...c,
          transform: { ...c.transform, position: positions[idx] },
        };
      }),
    })),

  rotateComponents: (ids, rotation) =>
    set((state) => ({
      components: state.components.map((c) => {
        if (!ids.includes(c.id)) return c;
        return {
          ...c,
          transform: {
            ...c.transform,
            rotation: (((c.transform.rotation + rotation) % 360 + 360) % 360) as any,
          },
        };
      }),
    })),

  // Trace mutations
  setTraces: (traces) => set({ traces }),

  addTrace: (trace) =>
    set((state) => ({ traces: [...state.traces, trace] })),

  removeTrace: (id) =>
    set((state) => ({ traces: state.traces.filter((t) => t.id !== id) })),

  // Undo/redo
  setCanUndo: (value) => set({ canUndo: value }),
  setCanRedo: (value) => set({ canRedo: value }),

  // Overlay
  setCursorWorldPosition: (pos) => set({ cursorWorldPosition: pos }),
  setGhostComponent: (component) => set({ ghostComponent: component }),
  setActiveTracePoints: (points) => set({ activeTracePoints: points }),
  setMeasurement: (measurement) => set({ measurement }),
  setCursor: (cursor) => set({ cursor }),
});
