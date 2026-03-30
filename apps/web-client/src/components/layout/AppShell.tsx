import { useStore } from '../../store';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { PropertiesPanel } from './PropertiesPanel';
import { StatusBar } from './StatusBar';
import { CanvasContainer } from '../canvas/CanvasContainer';
import { CanvasToolbar } from '../canvas/CanvasToolbar';
import { ModuleEditor } from '../modules/ModuleEditor';
import { BottomPanel } from '../debug/BottomPanel';
import { WorkspaceSettings } from '../dialogs/WorkspaceSettings';
import { NewProjectDialog } from '../dialogs/NewProject';

export function AppShell() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const propertiesPanelOpen = useStore((s) => s.propertiesPanelOpen);
  const moduleEditorOpen = useStore((s) => s.moduleEditorOpen);
  const debugPanelOpen = useStore((s) => s.debugPanelOpen);

  const shellClasses = [
    'app-shell',
    !sidebarOpen && 'app-shell--sidebar-collapsed',
    !propertiesPanelOpen && 'app-shell--properties-collapsed',
    debugPanelOpen && 'app-shell--debug-open',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClasses}>
      <Toolbar />
      {sidebarOpen && <Sidebar />}
      <div className="canvas-area">
        <CanvasContainer />
        <CanvasToolbar />
      </div>
      {propertiesPanelOpen && <PropertiesPanel />}
      <BottomPanel />
      <StatusBar />
      {moduleEditorOpen && <ModuleEditor />}
      <WorkspaceSettings />
      <NewProjectDialog />
    </div>
  );
}
