import { BoardId, ProjectId, LayerId } from './ids';
import { WorkspaceConfig } from './geometry';
import { Component } from './component';
import { TracePath } from './trace';

export enum LayerType {
  Signal = 'signal',
  Plane = 'plane',
  SilkscreenTop = 'silkscreen_top',
  SilkscreenBottom = 'silkscreen_bottom',
  SolderMaskTop = 'solder_mask_top',
  SolderMaskBottom = 'solder_mask_bottom',
  PasteTop = 'paste_top',
  PasteBottom = 'paste_bottom',
  Mechanical = 'mechanical',
}

export interface BoardLayer {
  id: LayerId;
  boardId: BoardId;
  name: string;
  type: LayerType;
  order: number;        // z-order stacking index
  color: string;        // hex color for rendering
  visible: boolean;
  locked: boolean;
  opacity: number;      // 0-1
}

export interface Board {
  id: BoardId;
  projectId: ProjectId;
  name: string;
  workspace: WorkspaceConfig;
  layers: BoardLayer[];
  components?: Component[];
  traces?: TracePath[];
  createdAt: string;
  updatedAt: string;
}
