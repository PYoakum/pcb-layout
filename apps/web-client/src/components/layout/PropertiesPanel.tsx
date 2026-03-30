import { useStore } from '../../store';
import { PathInspector } from '../debug/PathInspector';
import { SmartPropertiesPanel } from '../properties';

export function PropertiesPanel() {
  const inspectedPath = useStore((s) => s.inspectedPath);

  // When a trace path is being inspected, show the PathInspector
  if (inspectedPath) {
    return (
      <div className="properties-panel">
        <div className="properties-panel__header">Path Inspector</div>
        <PathInspector path={inspectedPath} />
      </div>
    );
  }

  return <SmartPropertiesPanel />;
}
