import { useState } from 'react';
import { useStore } from '../../store';
import type { TracePath, DebugLink } from '@pcb/domain';
import { DebugSeverity } from '@pcb/domain';

function segmentLength(seg: { start: { x: number; y: number }; end: { x: number; y: number } }): number {
  const dx = seg.end.x - seg.start.x;
  const dy = seg.end.y - seg.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function DebugLinkCard({
  link,
  onDelete,
}: {
  link: DebugLink;
  onDelete: () => void;
}) {
  return (
    <div className="debug-link-card">
      <div className="debug-link-card__header">
        <span className={`debug-severity debug-severity--${link.severity}`}>
          {link.severity}
        </span>
        <span className="debug-link-card__label">{link.label}</span>
        <button className="debug-btn debug-btn--small debug-btn--danger" onClick={onDelete}>
          Del
        </button>
      </div>
      {link.description && (
        <div className="debug-link-card__desc">{link.description}</div>
      )}
      <div className="debug-link-card__time">
        {new Date(link.createdAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

function AddDebugNoteForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { label: string; description: string; severity: DebugSeverity }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<DebugSeverity>(DebugSeverity.Info);

  const handleSubmit = () => {
    if (!label.trim()) return;
    onSubmit({ label: label.trim(), description: description.trim(), severity });
    setLabel('');
    setDescription('');
  };

  return (
    <div className="debug-note-form">
      <input
        className="debug-input"
        type="text"
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <textarea
        className="debug-textarea"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      <select
        className="debug-select"
        value={severity}
        onChange={(e) => setSeverity(e.target.value as DebugSeverity)}
      >
        <option value={DebugSeverity.Info}>Info</option>
        <option value={DebugSeverity.Warning}>Warning</option>
        <option value={DebugSeverity.Error}>Error</option>
        <option value={DebugSeverity.Critical}>Critical</option>
      </select>
      <div className="debug-note-form__actions">
        <button className="debug-btn debug-btn--primary" onClick={handleSubmit}>
          Add
        </button>
        <button className="debug-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function PathInspector({ path }: { path: TracePath }) {
  const highlightPath = useStore((s) => s.highlightPath);
  const highlightedPathId = useStore((s) => s.highlightedPathId);
  const debugLinks = useStore((s) => s.debugLinks);
  const addDebugLink = useStore((s) => s.addDebugLink);
  const removeDebugLink = useStore((s) => s.removeDebugLink);
  const clearDebugLinks = useStore((s) => s.clearDebugLinks);

  const [showAddForm, setShowAddForm] = useState(false);

  const pathLinks = debugLinks[path.id] ?? [];

  const totalLength = path.segments.reduce((sum, seg) => sum + segmentLength(seg), 0);
  const layersUsed = [...new Set(path.segments.map((s) => s.layerId))];

  const isHighlighted = highlightedPathId === path.id;

  return (
    <div className="debug-panel path-inspector">
      <div className="path-inspector__header">
        <div className="path-inspector__id">
          Path: {path.id.length > 16 ? `...${path.id.slice(-12)}` : path.id}
        </div>
        <div className="path-inspector__net">
          Net: {path.netId.length > 16 ? `...${path.netId.slice(-12)}` : path.netId}
        </div>
      </div>

      <div className="path-inspector__stats">
        <div className="path-stat">
          <span className="path-stat__label">Length</span>
          <span className="path-stat__value">{totalLength.toFixed(1)} mil</span>
        </div>
        <div className="path-stat">
          <span className="path-stat__label">Segments</span>
          <span className="path-stat__value">{path.segments.length}</span>
        </div>
        <div className="path-stat">
          <span className="path-stat__label">Vias</span>
          <span className="path-stat__value">{path.vias.length}</span>
        </div>
        <div className="path-stat">
          <span className="path-stat__label">Layers</span>
          <span className="path-stat__value">{layersUsed.length}</span>
        </div>
      </div>

      <button
        className={`debug-btn debug-btn--full ${isHighlighted ? 'debug-btn--active' : ''}`}
        onClick={() => highlightPath(isHighlighted ? null : path.id)}
      >
        {isHighlighted ? 'Unhighlight Path' : 'Highlight Path'}
      </button>

      <div className="path-inspector__section">
        <div className="path-inspector__section-title">Segments</div>
        <div className="path-segments-table">
          <div className="path-segments-table__header">
            <span>Start</span>
            <span>End</span>
            <span>Width</span>
            <span>Layer</span>
          </div>
          {path.segments.map((seg) => (
            <div key={seg.id} className="path-segments-table__row">
              <span>
                {seg.start.x.toFixed(0)},{seg.start.y.toFixed(0)}
              </span>
              <span>
                {seg.end.x.toFixed(0)},{seg.end.y.toFixed(0)}
              </span>
              <span>{seg.width}</span>
              <span>
                {seg.layerId.length > 10
                  ? `...${seg.layerId.slice(-8)}`
                  : seg.layerId}
              </span>
            </div>
          ))}
        </div>
      </div>

      {path.vias.length > 0 && (
        <div className="path-inspector__section">
          <div className="path-inspector__section-title">Vias</div>
          <div className="path-vias-list">
            {path.vias.map((via) => (
              <div key={via.id} className="path-via-item">
                <span>
                  ({via.position.x.toFixed(0)}, {via.position.y.toFixed(0)})
                </span>
                <span>Drill: {via.drillDiameter}</span>
                <span>
                  {via.fromLayerId.length > 8
                    ? `...${via.fromLayerId.slice(-6)}`
                    : via.fromLayerId}{' '}
                  &rarr;{' '}
                  {via.toLayerId.length > 8
                    ? `...${via.toLayerId.slice(-6)}`
                    : via.toLayerId}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="path-inspector__section">
        <div className="path-inspector__section-title">
          Debug Links ({pathLinks.length})
          {pathLinks.length > 0 && (
            <button
              className="debug-btn debug-btn--small debug-btn--danger"
              onClick={() => clearDebugLinks(path.id)}
              style={{ marginLeft: 8 }}
            >
              Clear All
            </button>
          )}
        </div>
        {pathLinks.map((link) => (
          <DebugLinkCard
            key={link.id}
            link={link}
            onDelete={() => removeDebugLink(path.id, link.id)}
          />
        ))}
        {!showAddForm ? (
          <button
            className="debug-btn debug-btn--full"
            onClick={() => setShowAddForm(true)}
          >
            + Add Debug Note
          </button>
        ) : (
          <AddDebugNoteForm
            onSubmit={(data) => {
              addDebugLink(path.id, data);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>
    </div>
  );
}
