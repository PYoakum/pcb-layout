import type { Board, BoardLayer, ProjectId, LayerType, WorkspaceConfig } from '@pcb/domain';

export interface CreateBoardRequest {
  projectId: ProjectId;
  name: string;
  workspace?: Partial<WorkspaceConfig>;
}

export interface UpdateBoardRequest {
  name?: string;
  workspace?: Partial<WorkspaceConfig>;
}

export interface UpdateLayersRequest {
  layers: Array<{
    name: string;
    type: LayerType;
    order: number;
    color: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
  }>;
}

export interface BoardResponse {
  data: Board;
}

export interface BoardListResponse {
  data: Board[];
  total: number;
}

export interface LayerListResponse {
  data: BoardLayer[];
}
