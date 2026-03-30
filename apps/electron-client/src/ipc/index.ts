import { registerFileHandlers } from './file-handlers.js';

/**
 * Register all IPC handlers for the main process.
 * Menu handlers use a push model (main -> renderer) via sendMenuAction,
 * so they don't need ipcMain.handle registration.
 */
export function registerAllHandlers(): void {
  registerFileHandlers();
}
