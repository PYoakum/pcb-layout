import type { StateCreator } from 'zustand';
import type { Board, BoardLayer, LayerId, WorkspaceConfig } from '@pcb/domain';

export interface BoardSlice {
  currentBoard: Board | null;
  layers: BoardLayer[];
  workspaceConfig: WorkspaceConfig | null;
  boardLoading: boolean;
  boardError: string | null;

  setCurrentBoard: (board: Board | null) => void;
  setLayers: (layers: BoardLayer[]) => void;
  toggleLayerVisibility: (layerId: LayerId) => void;
  toggleLayerLock: (layerId: LayerId) => void;
  setWorkspaceConfig: (config: WorkspaceConfig | null) => void;
  setBoardLoading: (loading: boolean) => void;
  setBoardError: (error: string | null) => void;
}

export const createBoardSlice: StateCreator<BoardSlice> = (set) => ({
  currentBoard: null,
  layers: [],
  workspaceConfig: null,
  boardLoading: false,
  boardError: null,

  setCurrentBoard: (board) =>
    set({
      currentBoard: board,
      layers: board?.layers ?? [],
      workspaceConfig: board?.workspace ?? null,
    }),

  setLayers: (layers) => set({ layers }),

  toggleLayerVisibility: (layerId) =>
    set((state) => {
      const newLayers = state.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      );
      return {
        layers: newLayers,
        currentBoard: state.currentBoard
          ? { ...state.currentBoard, layers: newLayers }
          : null,
      };
    }),

  toggleLayerLock: (layerId) =>
    set((state) => {
      const newLayers = state.layers.map((l) =>
        l.id === layerId ? { ...l, locked: !l.locked } : l
      );
      return {
        layers: newLayers,
        currentBoard: state.currentBoard
          ? { ...state.currentBoard, layers: newLayers }
          : null,
      };
    }),

  setWorkspaceConfig: (config) => set({ workspaceConfig: config }),
  setBoardLoading: (loading) => set({ boardLoading: loading }),
  setBoardError: (error) => set({ boardError: error }),
});
