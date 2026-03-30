import { useState } from 'react';
import { useStore } from '../../store';
import type { BoardLayer } from '@pcb/domain';
import { ModuleLibrary } from '../modules/ModuleLibrary';
import { ComponentLibrary } from '../library/ComponentLibrary';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="sidebar__section">
      <div className="sidebar__section-header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span
          className={`sidebar__section-toggle ${open ? '' : 'sidebar__section-toggle--collapsed'}`}
        >
          ▼
        </span>
      </div>
      {open && <div className="sidebar__section-body">{children}</div>}
    </div>
  );
}

function LayerItem({ layer }: { layer: BoardLayer }) {
  const activeLayerId = useStore((s) => s.activeLayerId);
  const setActiveLayerId = useStore((s) => s.setActiveLayerId);
  const toggleLayerVisibility = useStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock = useStore((s) => s.toggleLayerLock);
  const isActive = activeLayerId === layer.id;

  return (
    <div
      className={`layer-item ${isActive ? 'layer-item--active' : ''}`}
      onClick={() => setActiveLayerId(layer.id)}
    >
      <span className="layer-item__swatch" style={{ background: layer.color }} />
      <span className="layer-item__name">{layer.name}</span>
      <button
        className={`layer-item__action ${layer.visible ? '' : 'layer-item__action--off'}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleLayerVisibility(layer.id);
        }}
        title={layer.visible ? 'Hide layer' : 'Show layer'}
      >
        {layer.visible ? 'V' : 'H'}
      </button>
      <button
        className={`layer-item__action ${layer.locked ? '' : 'layer-item__action--off'}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleLayerLock(layer.id);
        }}
        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
      >
        {layer.locked ? 'L' : 'U'}
      </button>
    </div>
  );
}

export function Sidebar() {
  const layers = useStore((s) => s.layers);

  return (
    <div className="sidebar">
      <CollapsibleSection title="Components">
        <ComponentLibrary />
      </CollapsibleSection>

      <CollapsibleSection title="Modules">
        <ModuleLibrary />
      </CollapsibleSection>

      <CollapsibleSection title="Layers">
        {layers.length === 0 ? (
          <div className="sidebar__item" style={{ fontStyle: 'italic' }}>
            No board loaded
          </div>
        ) : (
          layers.map((layer) => <LayerItem key={layer.id} layer={layer} />)
        )}
      </CollapsibleSection>
    </div>
  );
}
