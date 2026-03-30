import { create } from 'zustand';
import { createProjectSlice, type ProjectSlice } from './project-slice';
import { createBoardSlice, type BoardSlice } from './board-slice';
import { createEditorSlice, type EditorSlice } from './editor-slice';
import { createUiSlice, type UiSlice } from './ui-slice';
import { createModuleSlice, type ModuleSlice } from './module-slice';
import { createDebugSlice, type DebugSlice } from './debug-slice';
import { createSessionSlice, type SessionSlice } from './session-slice';

export type AppStore = ProjectSlice & BoardSlice & EditorSlice & UiSlice & ModuleSlice & DebugSlice & SessionSlice;

export const useStore = create<AppStore>()((...args) => ({
  ...createProjectSlice(...args),
  ...createBoardSlice(...args),
  ...createEditorSlice(...args),
  ...createUiSlice(...args),
  ...createModuleSlice(...args),
  ...createDebugSlice(...args),
  ...createSessionSlice(...args),
}));

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
