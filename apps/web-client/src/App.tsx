import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useStore } from './store';
import type { Board, BoardId, ProjectId, LayerId } from '@pcb/domain';
import { createId, LayerType } from '@pcb/domain';

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

export function App() {
  const currentBoard = useStore((s) => s.currentBoard);
  const setCurrentBoard = useStore((s) => s.setCurrentBoard);
  const setActiveLayerId = useStore((s) => s.setActiveLayerId);

  // Create a default board on first load
  useEffect(() => {
    if (!currentBoard) {
      const board = createDefaultBoard();
      setCurrentBoard(board);
      // Default to Top Copper layer
      const topCopper = board.layers.find((l) => l.type === LayerType.Signal);
      setActiveLayerId(topCopper?.id ?? board.layers[0].id);
    }
  }, []);

  return <AppShell />;
}
