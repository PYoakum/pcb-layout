import { useStore } from '../../store';
import { Rotation } from '@pcb/domain';

export function MultiSelectProperties() {
  const selectedIds = useStore((s) => s.selectedIds);
  const layers = useStore((s) => s.layers);
  const clearSelection = useStore((s) => s.clearSelection);

  return (
    <>
      <div className="prop-section">
        <div className="prop-count">
          {selectedIds.length} items selected
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Align</div>
        <div className="prop-btn-group">
          <button className="prop-btn-group__btn" title="Align Left">L</button>
          <button className="prop-btn-group__btn" title="Align Center H">CH</button>
          <button className="prop-btn-group__btn" title="Align Right">R</button>
          <button className="prop-btn-group__btn" title="Align Top">T</button>
          <button className="prop-btn-group__btn" title="Align Center V">CV</button>
          <button className="prop-btn-group__btn" title="Align Bottom">B</button>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Distribute</div>
        <div className="prop-btn-group">
          <button className="prop-btn-group__btn" title="Distribute Horizontally">
            Horiz
          </button>
          <button className="prop-btn-group__btn" title="Distribute Vertically">
            Vert
          </button>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Common</div>
        <div className="prop-row">
          <span className="prop-label">Rotation</span>
          <select className="prop-select">
            <option value="">--</option>
            <option value={Rotation.R0}>0</option>
            <option value={Rotation.R90}>90</option>
            <option value={Rotation.R180}>180</option>
            <option value={Rotation.R270}>270</option>
          </select>
        </div>
        <div className="prop-row">
          <span className="prop-label">Layer</span>
          <select className="prop-select prop-select--wide">
            <option value="">--</option>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="prop-actions">
        <button
          className="prop-btn prop-btn--danger"
          onClick={clearSelection}
        >
          Delete All
        </button>
      </div>
    </>
  );
}
