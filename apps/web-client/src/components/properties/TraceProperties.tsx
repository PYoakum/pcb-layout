import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { TracePath } from '@pcb/domain';

interface Props {
  trace: TracePath;
}

export function TraceProperties({ trace }: Props) {
  const layers = useStore((s) => s.layers);
  const clearSelection = useStore((s) => s.clearSelection);

  // Compute total length from segments
  const totalLength = trace.segments.reduce((sum, seg) => {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  const segmentWidth = trace.segments[0]?.width ?? 0;
  const [width, setWidth] = useState(segmentWidth);
  const [cornerRadius, setCornerRadius] = useState(trace.cornerRadius ?? 0);
  const updateTrace = useStore((s) => s.setTraces);
  const traces = useStore((s) => s.traces);

  useEffect(() => {
    setWidth(trace.segments[0]?.width ?? 0);
    setCornerRadius(trace.cornerRadius ?? 0);
  }, [trace]);

  const applyCornerRadius = (r: number) => {
    setCornerRadius(r);
    const updated = traces.map((t) =>
      t.id === trace.id ? { ...t, cornerRadius: r } : t,
    );
    updateTrace(updated);
  };

  // Determine layer from first segment
  const segmentLayer = trace.segments[0]?.layerId ?? '';
  const layerInfo = layers.find((l) => l.id === segmentLayer);

  return (
    <>
      <div className="prop-section">
        <div className="prop-section-title">Trace</div>
        <div className="prop-row">
          <span className="prop-label">Path ID</span>
          <span className="prop-value" title={trace.id}>
            {trace.id.length > 12 ? `...${trace.id.slice(-10)}` : trace.id}
          </span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Net</span>
          <span className="prop-value">{trace.netId || '--'}</span>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Geometry</div>
        <div className="prop-row">
          <span className="prop-label">Length</span>
          <span className="prop-value">{totalLength.toFixed(1)} mils</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Segments</span>
          <span className="prop-value">{trace.segments.length}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Vias</span>
          <span className="prop-value">{trace.vias.length}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Width</span>
          <input
            className="prop-input"
            type="number"
            min={1}
            step={1}
            value={width}
            onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Corner Radius</span>
          <input
            className="prop-input"
            type="number"
            min={0}
            step={5}
            value={cornerRadius}
            onChange={(e) => applyCornerRadius(Math.max(0, Number(e.target.value)))}
          />
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Layer</div>
        <div className="prop-row">
          <span className="prop-label">Layer</span>
          <span className="prop-value">{layerInfo?.name ?? (segmentLayer || '--')}</span>
        </div>
      </div>

      <div className="prop-actions">
        <button className="prop-btn prop-btn--danger" onClick={clearSelection}>
          Delete Trace
        </button>
      </div>
    </>
  );
}
