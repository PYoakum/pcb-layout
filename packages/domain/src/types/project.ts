import { ProjectId, BoardId, ModuleId, LibraryAssetId } from './ids';

export interface Project {
  id: ProjectId;
  name: string;
  description: string;
  boards: BoardId[];
  modules: ModuleId[];
  libraryAssets: LibraryAssetId[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  defaultGridSpacing: number;
  defaultLayerCount: number;
  defaultBoardWidth: number;
  defaultBoardHeight: number;
  units: 'mils' | 'mm';
}

export interface LibraryAsset {
  id: LibraryAssetId;
  projectId: ProjectId;
  type: 'component' | 'module' | 'footprint';
  name: string;
  data: unknown;
  createdAt: string;
  updatedAt: string;
}
