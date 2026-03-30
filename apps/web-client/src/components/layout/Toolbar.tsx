import { useRef } from 'react';
import { useStore } from '../../store';
import type { EditorTool } from '../../store/editor-slice';
import { exportProject } from '../../api/client';
import { deserializeProject, validateProjectFile } from '@pcb/project-serialization';
import type { ProjectFile } from '@pcb/project-serialization';
import { LayerType } from '@pcb/domain';

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
  const currentProjectId = useStore((s) => s.currentProject?.id);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const setCurrentBoard = useStore((s) => s.setCurrentBoard);
  const setComponents = useStore((s) => s.setComponents);
  const setTraces = useStore((s) => s.setTraces);
  const setActiveLayerId = useStore((s) => s.setActiveLayerId);
  const addNotification = useStore((s) => s.addNotification);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json: ProjectFile = JSON.parse(text);

      const validation = validateProjectFile(json);
      if (validation.errors.length > 0) {
        addNotification({ type: 'error', message: `Invalid file: ${validation.errors[0].message}` });
        return;
      }

      const result = deserializeProject(json);

      setCurrentProject(result.project);

      if (result.boards.length > 0) {
        const board = result.boards[0];
        setCurrentBoard(board);
        setComponents(result.components);
        setTraces(result.paths);

        const topCopper = board.layers.find((l) => l.type === LayerType.Signal);
        setActiveLayerId(topCopper?.id ?? board.layers[0]?.id ?? null);
      }

      addNotification({ type: 'success', message: `Opened ${result.project.name}` });
    } catch (err) {
      addNotification({ type: 'error', message: `Failed to open file: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }

    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleExport = async () => {
    if (!currentProjectId) return;
    try {
      await exportProject(currentProjectId);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="toolbar">
      <span className="toolbar__project-name">{projectName}</span>

      <div className="toolbar__separator" />

      {/* File menu */}
      <div className="toolbar__group">
        <button className="toolbar__btn" onClick={openNewProjectDialog}>New</button>
        <button className="toolbar__btn" onClick={handleOpen}>Open</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pcb,.json"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />
        <button className="toolbar__btn">Save</button>
        <button className="toolbar__btn" onClick={handleExport}>Export .pcb</button>
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
