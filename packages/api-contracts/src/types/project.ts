import type { Project, ProjectSettings, BoardId, ModuleId, LibraryAssetId } from '@pcb/domain';

export interface CreateProjectRequest {
  name: string;
  description: string;
  settings?: Partial<ProjectSettings>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  boards?: BoardId[];
  modules?: ModuleId[];
  libraryAssets?: LibraryAssetId[];
  settings?: Partial<ProjectSettings>;
}

export interface ProjectResponse {
  data: Project;
}

export interface ProjectListResponse {
  data: Project[];
  total: number;
}
