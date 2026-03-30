import { useState } from 'react';
import { useStore } from '../../store';
import type { ProjectId, LayerId, BoardId } from '@pcb/domain';
import { LayerType } from '@pcb/domain';

const layerPresets = [
  { label: '2 Layer', value: 2 },
  { label: '4 Layer', value: 4 },
  { label: '6 Layer', value: 6 },
  { label: 'Custom', value: -1 },
];

export function NewProjectDialog() {
  const open = useStore((s) => s.newProjectDialogOpen);
  const close = useStore((s) => s.closeNewProjectDialog);

  const [name, setName] = useState('Untitled Project');
  const [description, setDescription] = useState('');
  const [boardWidth, setBoardWidth] = useState(4000);
  const [boardHeight, setBoardHeight] = useState(3000);
  const [layerPreset, setLayerPreset] = useState(2);
  const [customLayerCount, setCustomLayerCount] = useState(2);
  const [gridSpacing, setGridSpacing] = useState(50);

  if (!open) return null;

  const effectiveLayerCount = layerPreset === -1 ? customLayerCount : layerPreset;

  const handleCreate = () => {
    const setCurrentProject = useStore.getState().setCurrentProject;
    const setWorkspaceConfig = useStore.getState().setWorkspaceConfig;

    const project = {
      id: `proj_${Date.now()}` as ProjectId,
      name: name.trim() || 'Untitled Project',
      description,
      boards: [],
      modules: [],
      libraryAssets: [],
      settings: {
        defaultGridSpacing: Math.max(1, gridSpacing),
        defaultLayerCount: Math.max(1, effectiveLayerCount),
        defaultBoardWidth: Math.max(100, boardWidth),
        defaultBoardHeight: Math.max(100, boardHeight),
        units: 'mils' as const,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentProject(project);
    setWorkspaceConfig({
      width: Math.max(100, boardWidth),
      height: Math.max(100, boardHeight),
      grid: {
        spacingX: Math.max(1, gridSpacing),
        spacingY: Math.max(1, gridSpacing),
        subdivisions: 2,
        visible: true,
        snapEnabled: true,
      },
      layerCount: Math.max(1, effectiveLayerCount),
    });

    // Generate default layers
    const defaultColors = [
      '#ff4444', '#3344ff', '#44cc44', '#cccc44',
      '#cc44cc', '#44cccc', '#ff8844', '#8844ff',
    ];
    const setLayers = useStore.getState().setLayers;
    const defaultLayerNames = [
      'F.Cu', 'B.Cu', 'In1.Cu', 'In2.Cu', 'In3.Cu', 'In4.Cu',
      'F.SilkS', 'B.SilkS',
    ];
    const generatedLayers = Array.from({ length: effectiveLayerCount }, (_, i) => ({
      id: `layer_${Date.now()}_${i}` as LayerId,
      boardId: '' as BoardId,
      name: defaultLayerNames[i] ?? `Layer ${i + 1}`,
      type: LayerType.Signal,
      order: i,
      color: defaultColors[i % defaultColors.length],
      visible: true,
      locked: false,
      opacity: 1,
    }));
    setLayers(generatedLayers);

    close();
  };

  return (
    <div className="dialog-overlay" onClick={close}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <span className="dialog__title">New Project</span>
          <button className="dialog__close" onClick={close}>x</button>
        </div>
        <div className="dialog__body">
          <div className="dialog__field">
            <label className="dialog__label">Project Name</label>
            <input
              className="dialog__input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="dialog__field">
            <label className="dialog__label">Description</label>
            <textarea
              className="dialog__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="dialog__section">
            <div className="dialog__section-title">Default Board Size</div>
            <div className="dialog__row">
              <div className="dialog__field">
                <label className="dialog__label">Width (mils)</label>
                <input
                  className="dialog__input"
                  type="number"
                  min={100}
                  value={boardWidth}
                  onChange={(e) => setBoardWidth(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div className="dialog__field">
                <label className="dialog__label">Height (mils)</label>
                <input
                  className="dialog__input"
                  type="number"
                  min={100}
                  value={boardHeight}
                  onChange={(e) => setBoardHeight(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
          </div>

          <div className="dialog__section">
            <div className="dialog__section-title">Layer Count</div>
            <div className="dialog__presets">
              {layerPresets.map((p) => (
                <button
                  key={p.value}
                  className={`dialog__preset-btn ${layerPreset === p.value ? 'dialog__preset-btn--active' : ''}`}
                  onClick={() => setLayerPreset(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {layerPreset === -1 && (
              <div className="dialog__field" style={{ marginTop: 8 }}>
                <label className="dialog__label">Custom layer count</label>
                <input
                  className="dialog__input"
                  type="number"
                  min={1}
                  max={32}
                  value={customLayerCount}
                  onChange={(e) =>
                    setCustomLayerCount(Math.max(1, Math.min(32, Number(e.target.value))))
                  }
                />
              </div>
            )}
          </div>

          <div className="dialog__field">
            <label className="dialog__label">Default Grid Spacing (mils)</label>
            <input
              className="dialog__input"
              type="number"
              min={1}
              value={gridSpacing}
              onChange={(e) => setGridSpacing(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>
        <div className="dialog__footer">
          <button className="dialog__btn dialog__btn--secondary" onClick={close}>
            Cancel
          </button>
          <button className="dialog__btn dialog__btn--primary" onClick={handleCreate}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
