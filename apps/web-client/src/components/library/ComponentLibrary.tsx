import { useState, useMemo } from 'react';
import { useStore } from '../../store';
import {
  defaultComponents,
  categoryLabels,
  type LibraryComponent,
  type ComponentCategory,
} from '../../data/default-components';

const allCategories: Array<ComponentCategory | 'all'> = [
  'all',
  'passive',
  'ic',
  'connector',
  'discrete',
  'custom',
];

function FootprintPreview({ component }: { component: LibraryComponent }) {
  // Compute viewBox from body size + pad extents
  const allX = component.pads.map((p) => Math.abs(p.x) + p.width / 2);
  const allY = component.pads.map((p) => Math.abs(p.y) + p.height / 2);
  const extentX = Math.max(component.bodyWidth / 2, ...allX);
  const extentY = Math.max(component.bodyHeight / 2, ...allY);
  const margin = Math.max(extentX, extentY) * 0.15;
  const vw = (extentX + margin) * 2;
  const vh = (extentY + margin) * 2;

  return (
    <svg viewBox={`${-vw / 2} ${-vh / 2} ${vw} ${vh}`}>
      {/* Body outline */}
      <rect
        x={-component.bodyWidth / 2}
        y={-component.bodyHeight / 2}
        width={component.bodyWidth}
        height={component.bodyHeight}
        fill="none"
        stroke="#555"
        strokeWidth={vw * 0.02}
      />
      {/* Pads */}
      {component.pads.map((pad) => {
        if (pad.shape === 'circle') {
          return (
            <circle
              key={pad.name}
              cx={pad.x}
              cy={pad.y}
              r={pad.width / 2}
              fill="#00d4ff"
              opacity={0.7}
            />
          );
        }
        return (
          <rect
            key={pad.name}
            x={pad.x - pad.width / 2}
            y={pad.y - pad.height / 2}
            width={pad.width}
            height={pad.height}
            rx={pad.shape === 'oval' ? pad.height / 4 : 0}
            fill="#00d4ff"
            opacity={0.7}
          />
        );
      })}
      {/* Pin 1 dot */}
      {component.pads.length > 0 && (
        <circle
          cx={component.pads[0].x}
          cy={component.pads[0].y}
          r={vw * 0.03}
          fill="#ff4444"
        />
      )}
    </svg>
  );
}

export function ComponentLibrary() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('all');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const startPlacement = useStore((s) => s.startPlacement);

  const filtered = useMemo(() => {
    let list = defaultComponents;
    if (activeCategory !== 'all') {
      list = list.filter((c) => c.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.footprintName.toLowerCase().includes(q) ||
          c.designatorPrefix.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, activeCategory]);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    startPlacement(filtered[idx]);
  };

  return (
    <div className="component-library">
      <input
        className="component-library__search"
        type="text"
        placeholder="Search components..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelectedIdx(null);
        }}
      />
      <div className="component-library__tabs">
        {allCategories.map((cat) => (
          <button
            key={cat}
            className={`component-library__tab ${activeCategory === cat ? 'component-library__tab--active' : ''}`}
            onClick={() => {
              setActiveCategory(cat);
              setSelectedIdx(null);
            }}
          >
            {cat === 'all' ? 'All' : categoryLabels[cat]}
          </button>
        ))}
      </div>
      <div className="component-library__list">
        {filtered.length === 0 ? (
          <div className="component-library__empty">No components found</div>
        ) : (
          filtered.map((comp, i) => (
            <div
              key={`${comp.footprintName}-${comp.name}`}
              className={`component-card ${selectedIdx === i ? 'component-card--selected' : ''}`}
              onClick={() => handleSelect(i)}
            >
              <div className="component-card__preview">
                <FootprintPreview component={comp} />
              </div>
              <div className="component-card__info">
                <div className="component-card__name">{comp.name}</div>
                <div className="component-card__meta">
                  {comp.footprintName} | {comp.pinCount} pins
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
