import { useStore } from '../../store';
import type { EditorTool } from '../../store/editor-slice';

const tools: { id: EditorTool; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'place', label: 'Place' },
  { id: 'trace', label: 'Trace' },
  { id: 'pan', label: 'Pan' },
  { id: 'measure', label: 'Measure' },
];

export function Toolbar() {
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);
  const resetZoom = useStore((s) => s.resetZoom);
  const gridVisible = useStore((s) => s.gridVisible);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const projectName = useStore((s) => s.currentProject?.name ?? 'Untitled Project');
  const openNewProjectDialog = useStore((s) => s.openNewProjectDialog);
  const openWorkspaceSettings = useStore((s) => s.openWorkspaceSettings);

  return (
    <div className="toolbar">
      <span className="toolbar__project-name">{projectName}</span>

      <div className="toolbar__separator" />

      {/* File menu */}
      <div className="toolbar__group">
        <button className="toolbar__btn" onClick={openNewProjectDialog}>New</button>
        <button className="toolbar__btn">Open</button>
        <button className="toolbar__btn">Save</button>
      </div>

      <div className="toolbar__separator" />

      {/* Edit menu */}
      <div className="toolbar__group">
        <button className="toolbar__btn">Undo</button>
        <button className="toolbar__btn">Redo</button>
        <button className="toolbar__btn">Delete</button>
      </div>

      <div className="toolbar__separator" />

      {/* View controls */}
      <div className="toolbar__group">
        <button className="toolbar__btn" onClick={zoomIn}>Zoom +</button>
        <button className="toolbar__btn" onClick={zoomOut}>Zoom -</button>
        <button className="toolbar__btn" onClick={resetZoom}>Fit</button>
        <button
          className={`toolbar__btn ${gridVisible ? 'toolbar__btn--active' : ''}`}
          onClick={toggleGrid}
        >
          Grid
        </button>
        <button className="toolbar__btn" onClick={openWorkspaceSettings} title="Workspace Settings">
          Settings
        </button>
      </div>

      <div className="toolbar__separator" />

      {/* Tool selector */}
      <div className="toolbar__group">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`toolbar__btn ${activeTool === tool.id ? 'toolbar__btn--active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div className="toolbar__spacer" />

      {/* 2D/3D toggle */}
      <button
        className={`toolbar__toggle ${mode === '2d' ? 'toolbar__toggle--active' : ''}`}
        onClick={() => setMode('2d')}
      >
        2D
      </button>
      <button
        className={`toolbar__toggle ${mode === '3d' ? 'toolbar__toggle--active' : ''}`}
        onClick={() => setMode('3d')}
      >
        3D
      </button>
    </div>
  );
}
