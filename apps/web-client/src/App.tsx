import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useStore } from './store';
import type { Board, Project, BoardId, ProjectId, LayerId } from '@pcb/domain';
import { createId, LayerType } from '@pcb/domain';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function createDefaultBoard(): Board {
  const boardId = createId<BoardId>('board');
  return {
    id: boardId,
    projectId: createId<ProjectId>('proj'),
    name: 'Untitled Board',
    workspace: {
      width: 4000,
      height: 3000,
      grid: {
        spacingX: 5,
        spacingY: 5,
        subdivisions: 2,
        visible: true,
        snapEnabled: true,
      },
      layerCount: 6,
    },
    layers: [
      {
        id: createId<LayerId>('layer'),
        boardId,
        name: 'Top Silkscreen',
        type: LayerType.SilkscreenTop,
        order: 0,
        color: '#ffffff',
        visible: true,
        locked: false,
        opacity: 1,
      },
      {
        id: createId<LayerId>('layer'),
        boardId,
        name: 'Top Solder Mask',
        type: LayerType.SolderMaskTop,
        order: 1,
        color: '#00aa00',
        visible: true,
        locked: false,
        opacity: 0.6,
      },
      {
        id: createId<LayerId>('layer'),
        boardId,
        name: 'Top Copper',
        type: LayerType.Signal,
        order: 2,
        color: '#ff0000',
        visible: true,
        locked: false,
        opacity: 1,
      },
      {
        id: createId<LayerId>('layer'),
        boardId,
        name: 'Bottom Copper',
        type: LayerType.Signal,
        order: 3,
        color: '#0000ff',
        visible: true,
        locked: false,
        opacity: 1,
      },
      {
        id: createId<LayerId>('layer'),
        boardId,
        name: 'Bottom Solder Mask',
        type: LayerType.SolderMaskBottom,
        order: 4,
        color: '#00aa00',
        visible: true,
        locked: false,
        opacity: 0.6,
      },
      {
        id: createId<LayerId>('layer'),
        boardId,
        name: 'Bottom Silkscreen',
        type: LayerType.SilkscreenBottom,
        order: 5,
        color: '#ffffff',
        visible: true,
        locked: false,
        opacity: 1,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Register the default board and project with the API server so that
 * session creation (which validates boardId server-side) succeeds.
 * Returns server-assigned IDs so the local store stays in sync.
 */
async function syncToServer(
  project: Project,
  board: Board,
): Promise<{ projectId: ProjectId; boardId: BoardId } | null> {
  try {
    const projRes = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: project.name,
        description: project.description,
        settings: project.settings,
      }),
    });
    if (!projRes.ok) return null;
    const projData = await projRes.json();
    const serverProjectId = projData.data.id as ProjectId;

    const boardRes = await fetch(`${API_BASE}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: serverProjectId,
        name: board.name,
        workspace: board.workspace,
      }),
    });
    if (!boardRes.ok) return null;
    const boardData = await boardRes.json();
    const serverBoardId = boardData.data.id as BoardId;

    return { projectId: serverProjectId, boardId: serverBoardId };
  } catch {
    // Server may not be running — editor still works offline
    return null;
  }
}

export function App() {
  const currentBoard = useStore((s) => s.currentBoard);
  const setCurrentBoard = useStore((s) => s.setCurrentBoard);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const setActiveLayerId = useStore((s) => s.setActiveLayerId);

  // Create a default board on first load
  useEffect(() => {
    if (!currentBoard) {
      const board = createDefaultBoard();
      const now = new Date().toISOString();
      const project: Project = {
        id: board.projectId,
        name: 'Untitled Project',
        description: '',
        boards: [board.id],
        modules: [],
        libraryAssets: [],
        settings: {
          defaultGridSpacing: 5,
          defaultLayerCount: 6,
          defaultBoardWidth: 4000,
          defaultBoardHeight: 3000,
          units: 'mils',
        },
        createdAt: now,
        updatedAt: now,
      };

      // Set local state immediately so the editor is usable
      setCurrentProject(project);
      setCurrentBoard(board);
      const topCopper = board.layers.find((l) => l.type === LayerType.Signal);
      setActiveLayerId(topCopper?.id ?? board.layers[0].id);

      // Sync to API server and update local IDs to match server
      syncToServer(project, board).then((serverIds) => {
        if (serverIds) {
          const syncedBoard = { ...board, id: serverIds.boardId, projectId: serverIds.projectId };
          const syncedProject: Project = {
            ...project,
            id: serverIds.projectId,
            boards: [serverIds.boardId],
          };
          setCurrentProject(syncedProject);
          setCurrentBoard(syncedBoard);
        }
      });
    }
  }, []);

  return <AppShell />;
}
