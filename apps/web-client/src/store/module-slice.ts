import type { StateCreator } from 'zustand';
import type { Module, ModuleInstance, ModuleId, ModuleInstanceId, Point2D, Transform2D, Rotation } from '@pcb/domain';
import { createId } from '@pcb/domain';
import * as api from '../api/client';

export interface ModuleSlice {
  // Module library
  modules: Module[];
  loadingModules: boolean;

  // Module editor
  editingModule: Module | null;
  moduleEditorOpen: boolean;

  // Module instances on current board
  moduleInstances: ModuleInstance[];

  // Actions
  fetchModules: () => Promise<void>;
  createModule: (name: string, description: string) => void;
  openModuleEditor: (moduleId: ModuleId | null) => void;
  closeModuleEditor: () => void;
  saveModule: (module: Module) => Promise<void>;
  deleteModule: (id: ModuleId) => Promise<void>;

  // Module assembly
  addModuleToBoard: (moduleId: ModuleId, position: Point2D) => void;
  removeModuleFromBoard: (instanceId: ModuleInstanceId) => void;
  updateModuleInstance: (instanceId: ModuleInstanceId, transform: Transform2D) => void;
}

export const createModuleSlice: StateCreator<ModuleSlice> = (set, get) => ({
  modules: [],
  loadingModules: false,
  editingModule: null,
  moduleEditorOpen: false,
  moduleInstances: [],

  fetchModules: async () => {
    set({ loadingModules: true });
    try {
      const res = await api.getModules('current');
      set({ modules: res.data, loadingModules: false });
    } catch {
      set({ loadingModules: false });
    }
  },

  createModule: (name, description) => {
    const now = new Date().toISOString();
    const newModule: Module = {
      id: createId<ModuleId>('mod'),
      name,
      description,
      version: '0.1.0',
      components: [],
      internalNets: [],
      internalPaths: [],
      exposedPins: [],
      boundingBox: { min: { x: 0, y: 0 }, max: { x: 500, y: 500 } },
      tags: [],
      category: 'uncategorized',
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      modules: [...state.modules, newModule],
      editingModule: newModule,
      moduleEditorOpen: true,
    }));
  },

  openModuleEditor: (moduleId) => {
    if (moduleId === null) {
      const now = new Date().toISOString();
      const newModule: Module = {
        id: createId<ModuleId>('mod'),
        name: 'New Module',
        description: '',
        version: '0.1.0',
        components: [],
        internalNets: [],
        internalPaths: [],
        exposedPins: [],
        boundingBox: { min: { x: 0, y: 0 }, max: { x: 500, y: 500 } },
        tags: [],
        category: 'uncategorized',
        createdAt: now,
        updatedAt: now,
      };
      set({ editingModule: newModule, moduleEditorOpen: true });
    } else {
      const mod = get().modules.find((m) => m.id === moduleId) ?? null;
      set({ editingModule: mod ? { ...mod } : null, moduleEditorOpen: mod !== null });
    }
  },

  closeModuleEditor: () => {
    set({ editingModule: null, moduleEditorOpen: false });
  },

  saveModule: async (module) => {
    const updated = { ...module, updatedAt: new Date().toISOString() };
    set((state) => {
      const exists = state.modules.some((m) => m.id === module.id);
      return {
        modules: exists
          ? state.modules.map((m) => (m.id === module.id ? updated : m))
          : [...state.modules, updated],
        editingModule: null,
        moduleEditorOpen: false,
      };
    });
  },

  deleteModule: async (id) => {
    set((state) => ({
      modules: state.modules.filter((m) => m.id !== id),
      moduleInstances: state.moduleInstances.filter((mi) => mi.moduleId !== id),
    }));
  },

  addModuleToBoard: (moduleId, position) => {
    const mod = get().modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const instance: ModuleInstance = {
      id: createId<ModuleInstanceId>('mi'),
      moduleId,
      moduleVersion: mod.version,
      transform: { position, rotation: 0 as Rotation, mirrored: false },
      overrides: {},
    };
    set((state) => ({
      moduleInstances: [...state.moduleInstances, instance],
    }));
  },

  removeModuleFromBoard: (instanceId) => {
    set((state) => ({
      moduleInstances: state.moduleInstances.filter((mi) => mi.id !== instanceId),
    }));
  },

  updateModuleInstance: (instanceId, transform) => {
    set((state) => ({
      moduleInstances: state.moduleInstances.map((mi) =>
        mi.id === instanceId ? { ...mi, transform } : mi,
      ),
    }));
  },
});
