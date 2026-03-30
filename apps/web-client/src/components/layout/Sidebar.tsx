import { useState } from 'react';
import { useStore } from '../../store';
import type { BoardLayer, LayerType } from '@pcb/domain';
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

// ─── Layer Type Helpers ─────────────────────────────────────────────────────

function layerTypeLabel(type: LayerType): string {
  switch (type) {
    case 'signal':              return 'Signal';
    case 'plane':               return 'Plane';
    case 'silkscreen_top':      return 'Silk Top';
    case 'silkscreen_bottom':   return 'Silk Bot';
    case 'solder_mask_top':     return 'Mask Top';
    case 'solder_mask_bottom':  return 'Mask Bot';
    case 'paste_top':           return 'Paste Top';
    case 'paste_bottom':        return 'Paste Bot';
    case 'mechanical':          return 'Mech';
    default:                    return String(type);
  }
}

function layerTypeClass(type: LayerType): string {
  if (type === 'signal' || type === 'plane') return 'copper';
  if (type.startsWith('solder_mask')) return 'mask';
  if (type.startsWith('silkscreen')) return 'silk';
  if (type.startsWith('paste')) return 'paste';
  return 'other';
}

/** Position description for the stackup indicator. */
function layerStackLabel(layer: BoardLayer, copperCount: number): string {
  if (layer.type !== 'signal' && layer.type !== 'plane') return '';
  if (layer.order === 0) return 'Top';
  if (copperCount > 1 && layer.order === copperCount - 1) return 'Bot';
  return `In${layer.order}`;
}

// ─── Layer Item Component ───────────────────────────────────────────────────

function LayerItem({
  layer,
  copperCount,
  is3d,
}: {
  layer: BoardLayer;
  copperCount: number;
  is3d: boolean;
}) {
  const activeLayerId = useStore((s) => s.activeLayerId);
  const setActiveLayerId = useStore((s) => s.setActiveLayerId);
  const toggleLayerVisibility = useStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock = useStore((s) => s.toggleLayerLock);
  const setLayerOpacity = useStore((s) => s.setLayerOpacity);
  const isActive = activeLayerId === layer.id;
  const isCopperLayer = layer.type === 'signal' || layer.type === 'plane';
  const stackLabel = layerStackLabel(layer, copperCount);

  return (
    <div
      className={`layer-item ${isActive ? 'layer-item--active' : ''} ${!layer.visible ? 'layer-item--hidden' : ''}`}
      onClick={() => setActiveLayerId(layer.id)}
    >
      {/* Color swatch */}
      <span
        className="layer-item__swatch"
        style={{ background: layer.color }}
      />

      {/* Stackup position badge (copper layers only) */}
      {isCopperLayer && stackLabel && (
        <span className="layer-item__stack-badge">{stackLabel}</span>
      )}

      {/* Name + type */}
      <span className="layer-item__name">{layer.name}</span>
      <span className={`layer-item__type layer-item__type--${layerTypeClass(layer.type)}`}>
        {layerTypeLabel(layer.type)}
      </span>

      {/* Opacity slider (3D mode only, copper layers) */}
      {is3d && isCopperLayer && (
        <input
          type="range"
          className="layer-item__opacity"
          min={0}
          max={100}
          value={Math.round(layer.opacity * 100)}
          title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            setLayerOpacity(layer.id, Number(e.target.value) / 100);
          }}
        />
      )}

      {/* Visibility toggle */}
      <button
        className={`layer-item__action ${layer.visible ? '' : 'layer-item__action--off'}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleLayerVisibility(layer.id);
        }}
        title={layer.visible ? 'Hide layer (incl. components & traces)' : 'Show layer'}
      >
        {layer.visible ? 'V' : 'H'}
      </button>

      {/* Lock toggle */}
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

// ─── Sidebar ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const layers = useStore((s) => s.layers);
  const mode = useStore((s) => s.mode);
  const is3d = mode === '3d';

  const copperLayers = layers.filter(
    (l) => l.type === 'signal' || l.type === 'plane',
  );
  const nonCopperLayers = layers.filter(
    (l) => l.type !== 'signal' && l.type !== 'plane',
  );

  return (
    <div className="sidebar">
      <CollapsibleSection title="Components">
        <ComponentLibrary />
      </CollapsibleSection>

      <CollapsibleSection title="Modules">
        <ModuleLibrary />
      </CollapsibleSection>

      <CollapsibleSection title={is3d ? 'Layers (3D)' : 'Layers'}>
        {layers.length === 0 ? (
          <div className="sidebar__item" style={{ fontStyle: 'italic' }}>
            No board loaded
          </div>
        ) : (
          <>
            {/* Copper stackup */}
            <div className="layer-group__header">Copper Stackup</div>
            {copperLayers.map((layer) => (
              <LayerItem
                key={layer.id}
                layer={layer}
                copperCount={copperLayers.length}
                is3d={is3d}
              />
            ))}

            {/* Non-copper layers */}
            {nonCopperLayers.length > 0 && (
              <>
                <div className="layer-group__header">Finishing Layers</div>
                {nonCopperLayers.map((layer) => (
                  <LayerItem
                    key={layer.id}
                    layer={layer}
                    copperCount={copperLayers.length}
                    is3d={is3d}
                  />
                ))}
              </>
            )}
          </>
        )}
      </CollapsibleSection>
    </div>
  );
}
