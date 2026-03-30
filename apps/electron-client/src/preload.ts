import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  // File system operations
  openProject(): Promise<{ filePath: string; data: unknown } | null>;
  saveProject(filePath: string, data: unknown): Promise<boolean>;
  saveProjectAs(data: unknown): Promise<{ filePath: string } | null>;
  exportProject(format: string, data: unknown): Promise<{ filePath: string } | null>;

  // Dialog operations
  showOpenDialog(options: OpenDialogOptions): Promise<string[] | null>;
  showSaveDialog(options: SaveDialogOptions): Promise<string | null>;

  // App info
  getVersion(): string;
  getPlatform(): NodeJS.Platform;

  // Menu action listener
  onMenuAction(callback: (action: string) => void): () => void;
}

export interface OpenDialogOptions {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

const electronAPI: ElectronAPI = {
  // File system operations
  openProject: () => ipcRenderer.invoke('open-project'),
  saveProject: (filePath, data) => ipcRenderer.invoke('save-project', filePath, data),
  saveProjectAs: (data) => ipcRenderer.invoke('save-project-as', data),
  exportProject: (format, data) => ipcRenderer.invoke('export-project', format, data),

  // Dialog operations
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  // App info
  getVersion: () => process.env.npm_package_version ?? '0.0.1',
  getPlatform: () => process.platform,

  // Menu action listener
  onMenuAction: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => {
      callback(action);
    };
    ipcRenderer.on('menu-action', handler);
    return () => {
      ipcRenderer.removeListener('menu-action', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
