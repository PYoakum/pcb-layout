import { create } from 'zustand';
import { createProjectSlice, type ProjectSlice } from './project-slice';
import { createBoardSlice, type BoardSlice } from './board-slice';
import { createEditorSlice, type EditorSlice } from './editor-slice';
import { createUiSlice, type UiSlice } from './ui-slice';
import { createModuleSlice, type ModuleSlice } from './module-slice';
import { createDebugSlice, type DebugSlice } from './debug-slice';
import { createSessionSlice, type SessionSlice } from './session-slice';

export type AppStore = ProjectSlice & BoardSlice & EditorSlice & UiSlice & ModuleSlice & DebugSlice & SessionSlice;

// ── Session-storage persistence for HMR survival ────────────────────────────

const PERSIST_KEY = 'pcb-layout-state';

function saveState(state: AppStore): void {
  try {
    const snapshot = {
      currentProject: state.currentProject,
      currentBoard: state.currentBoard,
      components: state.components,
      traces: state.traces,
      mountingHoles: state.mountingHoles,
      silkscreenLabels: state.silkscreenLabels,
      modules: state.modules,
      moduleInstances: state.moduleInstances,
      viewport: state.viewport,
      activeTool: state.activeTool,
      activeLayerId: state.activeLayerId,
      gridVisible: state.gridVisible,
      snapEnabled: state.snapEnabled,
    };
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify(snapshot));
  } catch { /* quota exceeded or SSR — ignore */ }
}

function loadState(): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const useStore = create<AppStore>()((...args) => {
  const store = {
    ...createProjectSlice(...args),
    ...createBoardSlice(...args),
    ...createEditorSlice(...args),
    ...createUiSlice(...args),
    ...createModuleSlice(...args),
    ...createDebugSlice(...args),
    ...createSessionSlice(...args),
  };

  // Rehydrate from sessionStorage if available (survives HMR)
  const saved = loadState();
  if (saved) {
    Object.assign(store, saved);
  }

  return store;
});

// Persist on every state change (debounced to avoid thrashing)
let persistTimer: ReturnType<typeof setTimeout> | undefined;
useStore.subscribe((state) => {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => saveState(state), 300);
});

// Expose store on window for headless screenshot injection (Puppeteer)
if (typeof window !== 'undefined') {
  (window as any).__ZUSTAND_STORE__ = useStore;
}

// Convenience selector hooks
export const useProject = () =>
  useStore((s) => ({
    currentProject: s.currentProject,
    projects: s.projects,
    loading: s.projectsLoading,
    error: s.projectError,
  }));

export const useBoard = () =>
  useStore((s) => ({
    currentBoard: s.currentBoard,
    layers: s.layers,
    workspaceConfig: s.workspaceConfig,
    loading: s.boardLoading,
    error: s.boardError,
  }));

export const useEditor = () =>
  useStore((s) => ({
    activeTool: s.activeTool,
    selectedIds: s.selectedIds,
    hoveredId: s.hoveredId,
    viewport: s.viewport,
    gridVisible: s.gridVisible,
    snapEnabled: s.snapEnabled,
    activeLayerId: s.activeLayerId,
    components: s.components,
    traces: s.traces,
    canUndo: s.canUndo,
    canRedo: s.canRedo,
    ghostComponent: s.ghostComponent,
    activeTracePoints: s.activeTracePoints,
    measurement: s.measurement,
    cursor: s.cursor,
  }));

export const useUi = () =>
  useStore((s) => ({
    sidebarOpen: s.sidebarOpen,
    propertiesPanelOpen: s.propertiesPanelOpen,
    theme: s.theme,
    mode: s.mode,
    notifications: s.notifications,
  }));

export const useModules = () =>
  useStore((s) => ({
    modules: s.modules,
    loadingModules: s.loadingModules,
    editingModule: s.editingModule,
    moduleEditorOpen: s.moduleEditorOpen,
    moduleInstances: s.moduleInstances,
  }));

export const useDebug = () =>
  useStore((s) => ({
    validationResults: s.validationResults,
    validating: s.validating,
    highlightedNetId: s.highlightedNetId,
    highlightedPathId: s.highlightedPathId,
    highlightedViolationIds: s.highlightedViolationIds,
    inspectedPath: s.inspectedPath,
    inspectedNet: s.inspectedNet,
    debugPanelOpen: s.debugPanelOpen,
    debugActiveTab: s.debugActiveTab,
  }));
