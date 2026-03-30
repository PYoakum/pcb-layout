import type { StateCreator } from 'zustand';

export type Theme = 'dark';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface UiSlice {
  sidebarOpen: boolean;
  propertiesPanelOpen: boolean;
  theme: Theme;
  notifications: Notification[];
  mode: '2d' | '3d';
  workspaceSettingsOpen: boolean;
  newProjectDialogOpen: boolean;

  toggleSidebar: () => void;
  togglePropertiesPanel: () => void;
  setMode: (mode: '2d' | '3d') => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  openWorkspaceSettings: () => void;
  closeWorkspaceSettings: () => void;
  openNewProjectDialog: () => void;
  closeNewProjectDialog: () => void;
}

let notifCounter = 0;

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  sidebarOpen: true,
  propertiesPanelOpen: true,
  theme: 'dark',
  notifications: [],
  mode: '2d',
  workspaceSettingsOpen: false,
  newProjectDialogOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  togglePropertiesPanel: () =>
    set((state) => ({ propertiesPanelOpen: !state.propertiesPanelOpen })),

  setMode: (mode) => set({ mode }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: `notif_${++notifCounter}` },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  openWorkspaceSettings: () => set({ workspaceSettingsOpen: true }),
  closeWorkspaceSettings: () => set({ workspaceSettingsOpen: false }),
  openNewProjectDialog: () => set({ newProjectDialogOpen: true }),
  closeNewProjectDialog: () => set({ newProjectDialogOpen: false }),
});
