import { app, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { sendMenuAction } from './ipc/menu-handlers.js';

const isMac = process.platform === 'darwin';

export function buildMenu(window: BrowserWindow | null): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [];

  // macOS app menu
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  // File menu
  template.push({
    label: 'File',
    submenu: [
      {
        label: 'New Project',
        accelerator: 'CmdOrCtrl+N',
        click: () => sendMenuAction('new-project'),
      },
      {
        label: 'Open Project...',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendMenuAction('open-project'),
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: () => sendMenuAction('save'),
      },
      {
        label: 'Save As...',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => sendMenuAction('save-as'),
      },
      { type: 'separator' },
      {
        label: 'Export...',
        accelerator: 'CmdOrCtrl+E',
        click: () => sendMenuAction('export'),
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  });

  // Edit menu
  template.push({
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: () => sendMenuAction('undo'),
      },
      {
        label: 'Redo',
        accelerator: 'CmdOrCtrl+Shift+Z',
        click: () => sendMenuAction('redo'),
      },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      {
        label: 'Delete',
        accelerator: 'Delete',
        click: () => sendMenuAction('delete'),
      },
      { type: 'separator' },
      { role: 'selectAll' },
    ],
  });

  // View menu
  template.push({
    label: 'View',
    submenu: [
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+=',
        click: () => sendMenuAction('zoom-in'),
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: () => sendMenuAction('zoom-out'),
      },
      {
        label: 'Zoom to Fit',
        accelerator: 'CmdOrCtrl+0',
        click: () => sendMenuAction('zoom-to-fit'),
      },
      { type: 'separator' },
      {
        label: 'Toggle Grid',
        accelerator: 'CmdOrCtrl+G',
        click: () => sendMenuAction('toggle-grid'),
      },
      {
        label: 'Toggle Snap',
        click: () => sendMenuAction('toggle-snap'),
      },
      { type: 'separator' },
      {
        label: 'Toggle Sidebar',
        accelerator: 'CmdOrCtrl+B',
        click: () => sendMenuAction('toggle-sidebar'),
      },
      {
        label: 'Toggle Properties',
        accelerator: 'CmdOrCtrl+I',
        click: () => sendMenuAction('toggle-properties'),
      },
      { type: 'separator' },
      {
        label: '2D Mode',
        accelerator: 'CmdOrCtrl+2',
        click: () => sendMenuAction('mode-2d'),
      },
      {
        label: '3D Mode',
        accelerator: 'CmdOrCtrl+3',
        click: () => sendMenuAction('mode-3d'),
      },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'toggleDevTools' },
    ],
  });

  // Help menu
  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'About PCB Layout',
        click: () => sendMenuAction('about'),
      },
      {
        label: 'Documentation',
        click: () => sendMenuAction('documentation'),
      },
    ],
  });

  return template;
}
