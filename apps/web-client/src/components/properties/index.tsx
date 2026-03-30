import { useStore } from '../../store';
import { ComponentProperties } from './ComponentProperties';
import { MultiSelectProperties } from './MultiSelectProperties';
import { TraceProperties } from './TraceProperties';

export function SmartPropertiesPanel() {
  const selectedIds = useStore((s) => s.selectedIds);
  const currentBoard = useStore((s) => s.currentBoard);

  if (selectedIds.length === 0) {
    return (
      <div className="properties-panel">
        <div className="properties-panel__header">Properties</div>
        <div className="properties-panel__empty">
          No item selected.<br />
          Select a component, trace, or via to view its properties.
        </div>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="properties-panel">
        <div className="properties-panel__header">Properties</div>
        <MultiSelectProperties />
      </div>
    );
  }

  // Single selection - determine type
  const selectedId = selectedIds[0];

  // Check if it's a component
  const component = currentBoard?.components?.find((c) => c.id === selectedId);
  if (component) {
    return (
      <div className="properties-panel">
        <div className="properties-panel__header">Component Properties</div>
        <ComponentProperties component={component} />
      </div>
    );
  }

  // Check if it's a trace path
  const trace = currentBoard?.traces?.find((t) => t.id === selectedId);
  if (trace) {
    return (
      <div className="properties-panel">
        <div className="properties-panel__header">Trace Properties</div>
        <TraceProperties trace={trace} />
      </div>
    );
  }

  // Fallback: unknown item
  return (
    <div className="properties-panel">
      <div className="properties-panel__header">Properties</div>
      <div className="prop-section">
        <div className="prop-section-title">Selection</div>
        <div className="prop-row">
          <span className="prop-label">ID</span>
          <span className="prop-value" title={selectedId}>
            {selectedId.length > 12 ? `...${selectedId.slice(-10)}` : selectedId}
          </span>
        </div>
      </div>
    </div>
  );
}
