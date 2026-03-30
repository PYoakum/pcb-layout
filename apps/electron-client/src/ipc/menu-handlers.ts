import { BrowserWindow } from 'electron';

/**
 * Send a menu action to the focused renderer process.
 */
export function sendMenuAction(action: string): void {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send('menu-action', action);
  }
}
