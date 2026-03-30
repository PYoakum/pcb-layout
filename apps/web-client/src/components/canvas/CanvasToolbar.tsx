import { useStore } from '../../store';

export function CanvasToolbar() {
  const viewport = useStore((s) => s.viewport);
  const gridVisible = useStore((s) => s.gridVisible);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const mode = useStore((s) => s.mode);
  const activeTool = useStore((s) => s.activeTool);
  const traceWidth = useStore((s) => s.traceWidth);

  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);
  const resetZoom = useStore((s) => s.resetZoom);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const toggleSnap = useStore((s) => s.toggleSnap);
  const setMode = useStore((s) => s.setMode);
  const setTraceWidth = useStore((s) => s.setTraceWidth);

  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="canvas-toolbar">
      <div className="canvas-toolbar__group">
        <button
          className="canvas-toolbar__btn"
          onClick={zoomIn}
          title="Zoom In"
        >
          +
        </button>
        <span className="canvas-toolbar__zoom-display">{zoomPercent}%</span>
        <button
          className="canvas-toolbar__btn"
          onClick={zoomOut}
          title="Zoom Out"
        >
          -
        </button>
        <button
          className="canvas-toolbar__btn"
          onClick={resetZoom}
          title="Reset Zoom"
        >
          1:1
        </button>
      </div>

      <div className="canvas-toolbar__divider" />

      <div className="canvas-toolbar__group">
        <button
          className={`canvas-toolbar__btn ${gridVisible ? 'canvas-toolbar__btn--active' : ''}`}
          onClick={toggleGrid}
          title="Toggle Grid"
        >
          Grid
        </button>
        <button
          className={`canvas-toolbar__btn ${snapEnabled ? 'canvas-toolbar__btn--active' : ''}`}
          onClick={toggleSnap}
          title="Toggle Snap"
        >
          Snap
        </button>
      </div>

      {activeTool === 'trace' && (
        <>
          <div className="canvas-toolbar__divider" />
          <div className="canvas-toolbar__group">
            <span className="canvas-toolbar__zoom-display">W:</span>
            <select
              value={traceWidth}
              onChange={(e) => setTraceWidth(Number(e.target.value))}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '3px',
                padding: '2px 4px',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
              title="Trace Width (mils)"
            >
              <option value="4">4 mil</option>
              <option value="6">6 mil</option>
              <option value="8">8 mil</option>
              <option value="10">10 mil</option>
              <option value="12">12 mil</option>
              <option value="16">16 mil</option>
              <option value="20">20 mil</option>
              <option value="24">24 mil</option>
              <option value="32">32 mil</option>
              <option value="50">50 mil</option>
            </select>
          </div>
        </>
      )}

      <div className="canvas-toolbar__divider" />

      <div className="canvas-toolbar__group">
        <button
          className={`canvas-toolbar__btn ${mode === '2d' ? 'canvas-toolbar__btn--active' : ''}`}
          onClick={() => setMode('2d')}
          title="2D View"
        >
          2D
        </button>
        <button
          className={`canvas-toolbar__btn ${mode === '3d' ? 'canvas-toolbar__btn--active' : ''}`}
          onClick={() => setMode('3d')}
          title="3D View"
        >
          3D
        </button>
      </div>
    </div>
  );
}
