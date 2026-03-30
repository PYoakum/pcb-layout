import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

const PCB_FILE_FILTERS = [
  { name: 'PCB Layout Project', extensions: ['pcb'] },
  { name: 'JSON Files', extensions: ['json'] },
  { name: 'All Files', extensions: ['*'] },
];

export function registerFileHandlers(): void {
  ipcMain.handle('open-project', async () => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;

    const result = await dialog.showOpenDialog(window, {
      title: 'Open Project',
      filters: PCB_FILE_FILTERS,
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return { filePath, data };
  });

  ipcMain.handle('save-project', async (_event, filePath: string, data: unknown) => {
    try {
      const json = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, json, 'utf-8');
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('save-project-as', async (_event, data: unknown) => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;

    const result = await dialog.showSaveDialog(window, {
      title: 'Save Project As',
      filters: PCB_FILE_FILTERS,
      defaultPath: 'untitled.pcb',
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(result.filePath, json, 'utf-8');
    return { filePath: result.filePath };
  });

  ipcMain.handle('export-project', async (_event, format: string, data: unknown) => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;

    const exportFilters: Record<string, Electron.FileFilter[]> = {
      gerber: [{ name: 'Gerber Files', extensions: ['gbr'] }],
      svg: [{ name: 'SVG Image', extensions: ['svg'] }],
      png: [{ name: 'PNG Image', extensions: ['png'] }],
      pdf: [{ name: 'PDF Document', extensions: ['pdf'] }],
      json: [{ name: 'JSON', extensions: ['json'] }],
    };

    const filters = exportFilters[format] ?? [{ name: 'All Files', extensions: ['*'] }];
    const ext = filters[0]?.extensions[0] ?? 'json';

    const result = await dialog.showSaveDialog(window, {
      title: `Export as ${format.toUpperCase()}`,
      filters,
      defaultPath: `export.${ext}`,
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    const exportData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await fs.writeFile(result.filePath, exportData, 'utf-8');
    return { filePath: result.filePath };
  });

  ipcMain.handle('show-open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;

    const result = await dialog.showOpenDialog(window, options);
    if (result.canceled) return null;
    return result.filePaths;
  });

  ipcMain.handle('show-save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) return null;

    const result = await dialog.showSaveDialog(window, options);
    if (result.canceled || !result.filePath) return null;
    return result.filePath;
  });
}
