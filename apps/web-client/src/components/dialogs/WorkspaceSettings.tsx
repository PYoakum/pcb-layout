import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { BoardLayer, LayerId, BoardId } from '@pcb/domain';
import { LayerType } from '@pcb/domain';

const MILS_TO_MM = 0.0254;

const layerTypeOptions = Object.values(LayerType);

const defaultLayerColors = [
  '#ff4444', '#3344ff', '#44cc44', '#cccc44',
  '#cc44cc', '#44cccc', '#ff8844', '#8844ff',
  '#888888',
];

interface LayerDraft {
  id: string;
  name: string;
  type: LayerType;
  color: string;
  order: number;
}

export function WorkspaceSettings() {
  const open = useStore((s) => s.workspaceSettingsOpen);
  const close = useStore((s) => s.closeWorkspaceSettings);
  const workspaceConfig = useStore((s) => s.workspaceConfig);
  const setWorkspaceConfig = useStore((s) => s.setWorkspaceConfig);
  const layers = useStore((s) => s.layers);
  const setLayers = useStore((s) => s.setLayers);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const toggleSnap = useStore((s) => s.toggleSnap);

  const [width, setWidth] = useState(4000);
  const [height, setHeight] = useState(3000);
  const [gridSpacingX, setGridSpacingX] = useState(50);
  const [gridSpacingY, setGridSpacingY] = useState(50);
  const [subdivisions, setSubdivisions] = useState(2);
  const [gridSnapSize, setGridSnapSize] = useState(25);
  const [units, setUnits] = useState<'mils' | 'mm'>('mils');
  const [layerDrafts, setLayerDrafts] = useState<LayerDraft[]>([]);

  useEffect(() => {
    if (open) {
      if (workspaceConfig) {
        setWidth(workspaceConfig.width);
        setHeight(workspaceConfig.height);
        setGridSpacingX(workspaceConfig.grid.spacingX);
        setGridSpacingY(workspaceConfig.grid.spacingY);
        setSubdivisions(workspaceConfig.grid.subdivisions);
        setGridSnapSize(workspaceConfig.grid.spacingX);
      }
      setLayerDrafts(
        layers.map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
          color: l.color,
          order: l.order,
        })),
      );
    }
  }, [open, workspaceConfig, layers]);

  if (!open) return null;

  const toMm = (mils: number) => (mils * MILS_TO_MM).toFixed(2);

  const handleApply = () => {
    const newConfig = {
      width: Math.max(100, width),
      height: Math.max(100, height),
      grid: {
        spacingX: Math.max(1, gridSpacingX),
        spacingY: Math.max(1, gridSpacingY),
        subdivisions: Math.max(1, subdivisions),
        visible: true,
        snapEnabled,
      },
      layerCount: layerDrafts.length,
    };
    setWorkspaceConfig(newConfig);

    const updatedLayers: BoardLayer[] = layerDrafts.map((draft, i) => {
      const existing = layers.find((l) => l.id === draft.id);
      return {
        id: draft.id as LayerId,
        boardId: (existing?.boardId ?? '') as BoardId,
        name: draft.name,
        type: draft.type,
        order: i,
        color: draft.color,
        visible: existing?.visible ?? true,
        locked: existing?.locked ?? false,
        opacity: existing?.opacity ?? 1,
      };
    });
    setLayers(updatedLayers);
    close();
  };

  const addLayer = () => {
    const idx = layerDrafts.length;
    setLayerDrafts([
      ...layerDrafts,
      {
        id: `layer_new_${Date.now()}`,
        name: `Layer ${idx + 1}`,
        type: LayerType.Signal,
        color: defaultLayerColors[idx % defaultLayerColors.length],
        order: idx,
      },
    ]);
  };

  const removeLayer = (id: string) => {
    setLayerDrafts(layerDrafts.filter((l) => l.id !== id));
  };

  const updateLayerDraft = (id: string, patch: Partial<LayerDraft>) => {
    setLayerDrafts(
      layerDrafts.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  };

  const moveLayer = (id: string, direction: -1 | 1) => {
    const idx = layerDrafts.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= layerDrafts.length) return;
    const next = [...layerDrafts];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setLayerDrafts(next);
  };

  return (
    <div className="dialog-overlay" onClick={close}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog__header">
          <span className="dialog__title">Workspace Settings</span>
          <button className="dialog__close" onClick={close}>x</button>
        </div>
        <div className="dialog__body">
          {/* Board Dimensions */}
          <div className="dialog__section">
            <div className="dialog__section-title">Board Dimensions</div>
            <div className="dialog__row">
              <div className="dialog__field">
                <label className="dialog__label">Width ({units})</label>
                <input
                  className="dialog__input"
                  type="number"
                  min={100}
                  value={width}
                  onChange={(e) => setWidth(Math.max(0, Number(e.target.value)))}
                />
                <div className="dialog__hint">{toMm(width)} mm</div>
              </div>
              <div className="dialog__field">
                <label className="dialog__label">Height ({units})</label>
                <input
                  className="dialog__input"
                  type="number"
                  min={100}
                  value={height}
                  onChange={(e) => setHeight(Math.max(0, Number(e.target.value)))}
                />
                <div className="dialog__hint">{toMm(height)} mm</div>
              </div>
            </div>
          </div>

          {/* Grid Settings */}
          <div className="dialog__section">
            <div className="dialog__section-title">Grid Settings</div>
            <div className="dialog__row">
              <div className="dialog__field">
                <label className="dialog__label">Spacing X</label>
                <input
                  className="dialog__input"
                  type="number"
                  min={1}
                  value={gridSpacingX}
                  onChange={(e) => setGridSpacingX(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="dialog__field">
                <label className="dialog__label">Spacing Y</label>
                <input
                  className="dialog__input"
                  type="number"
                  min={1}
                  value={gridSpacingY}
                  onChange={(e) => setGridSpacingY(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="dialog__field">
                <label className="dialog__label">Subdivisions</label>
                <input
                  className="dialog__input"
                  type="number"
                  min={1}
                  max={10}
                  value={subdivisions}
                  onChange={(e) => setSubdivisions(Math.max(1, Number(e.target.value)))}
                />
              </div>
            </div>
          </div>

          {/* Snap Settings */}
          <div className="dialog__section">
            <div className="dialog__section-title">Snap Settings</div>
            <div className="dialog__checkbox-row">
              <input
                type="checkbox"
                id="snap-enabled"
                checked={snapEnabled}
                onChange={toggleSnap}
              />
              <label className="dialog__checkbox-label" htmlFor="snap-enabled">
                Snap to grid
              </label>
            </div>
            <div className="dialog__field">
              <label className="dialog__label">Grid snap size</label>
              <input
                className="dialog__input"
                type="number"
                min={1}
                value={gridSnapSize}
                onChange={(e) => setGridSnapSize(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          {/* Units */}
          <div className="dialog__section">
            <div className="dialog__section-title">Units</div>
            <div className="dialog__presets">
              <button
                className={`dialog__preset-btn ${units === 'mils' ? 'dialog__preset-btn--active' : ''}`}
                onClick={() => setUnits('mils')}
              >
                Mils
              </button>
              <button
                className={`dialog__preset-btn ${units === 'mm' ? 'dialog__preset-btn--active' : ''}`}
                onClick={() => setUnits('mm')}
              >
                Millimeters
              </button>
            </div>
          </div>

          {/* Layers */}
          <div className="dialog__section">
            <div className="dialog__section-title">
              Layers ({layerDrafts.length})
            </div>
            <div className="dialog__layer-list">
              {layerDrafts.map((draft) => (
                <div key={draft.id} className="dialog__layer-row">
                  <div className="dialog__layer-order-btns">
                    <button
                      className="dialog__layer-order-btn"
                      onClick={() => moveLayer(draft.id, -1)}
                      title="Move up"
                    >
                      ^
                    </button>
                    <button
                      className="dialog__layer-order-btn"
                      onClick={() => moveLayer(draft.id, 1)}
                      title="Move down"
                    >
                      v
                    </button>
                  </div>
                  <input
                    type="color"
                    className="dialog__layer-color"
                    value={draft.color}
                    onChange={(e) =>
                      updateLayerDraft(draft.id, { color: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) =>
                      updateLayerDraft(draft.id, { name: e.target.value })
                    }
                  />
                  <select
                    value={draft.type}
                    onChange={(e) =>
                      updateLayerDraft(draft.id, {
                        type: e.target.value as LayerType,
                      })
                    }
                  >
                    {layerTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    className="dialog__layer-remove-btn"
                    onClick={() => removeLayer(draft.id)}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
            <div className="dialog__layer-actions">
              <button className="dialog__btn dialog__btn--secondary" onClick={addLayer}>
                + Add Layer
              </button>
            </div>
          </div>
        </div>
        <div className="dialog__footer">
          <button className="dialog__btn dialog__btn--secondary" onClick={close}>
            Cancel
          </button>
          <button className="dialog__btn dialog__btn--primary" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
