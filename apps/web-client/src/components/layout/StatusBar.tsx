import { useStore } from '../../store';

export function StatusBar() {
  const viewport = useStore((s) => s.viewport);
  const cursorPos = useStore((s) => s.cursorWorldPosition);
  const gridVisible = useStore((s) => s.gridVisible);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const selectedIds = useStore((s) => s.selectedIds);
  const activeLayerId = useStore((s) => s.activeLayerId);
  const layers = useStore((s) => s.layers);
  const workspaceConfig = useStore((s) => s.workspaceConfig);

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const gridSpacing = workspaceConfig?.grid.spacingX ?? 50;
  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="statusbar">
      <div className="statusbar__item">
        <span className="statusbar__label">X:</span>
        <span className="statusbar__value">{cursorPos.x.toFixed(0)}</span>
        <span className="statusbar__label">Y:</span>
        <span className="statusbar__value">{cursorPos.y.toFixed(0)}</span>
      </div>

      <div className="statusbar__item">
        <span className="statusbar__label">Zoom:</span>
        <span className="statusbar__value">{zoomPercent}%</span>
      </div>

      <div className="statusbar__item">
        <span className="statusbar__label">Grid:</span>
        <span className="statusbar__value">
          {gridVisible ? `${gridSpacing} mil` : 'off'}
        </span>
      </div>

      <div className="statusbar__item">
        <span className="statusbar__label">Snap:</span>
        <span className="statusbar__value">{snapEnabled ? 'on' : 'off'}</span>
      </div>

      <div className="statusbar__spacer" />

      <div className="statusbar__item">
        <span className="statusbar__label">Layer:</span>
        <span className="statusbar__value">
          {activeLayer?.name ?? 'none'}
        </span>
      </div>

      {selectedIds.length > 0 && (
        <div className="statusbar__item">
          <span className="statusbar__label">Selected:</span>
          <span className="statusbar__value">{selectedIds.length}</span>
        </div>
      )}
    </div>
  );
}
