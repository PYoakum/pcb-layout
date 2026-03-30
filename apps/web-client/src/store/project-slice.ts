import type { StateCreator } from 'zustand';
import type { Project, ProjectId } from '@pcb/domain';

export interface ProjectSlice {
  currentProject: Project | null;
  projects: Project[];
  projectsLoading: boolean;
  projectError: string | null;

  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setProjectsLoading: (loading: boolean) => void;
  setProjectError: (error: string | null) => void;
}

export const createProjectSlice: StateCreator<ProjectSlice> = (set) => ({
  currentProject: null,
  projects: [],
  projectsLoading: false,
  projectError: null,

  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  setProjectsLoading: (loading) => set({ projectsLoading: loading }),
  setProjectError: (error) => set({ projectError: error }),
});
