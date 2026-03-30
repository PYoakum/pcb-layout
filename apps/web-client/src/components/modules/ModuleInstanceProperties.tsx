import { useStore } from '../../store';
import type { ModuleInstanceId, Rotation } from '@pcb/domain';

interface ModuleInstancePropertiesProps {
  instanceId: ModuleInstanceId;
}

export function ModuleInstanceProperties({ instanceId }: ModuleInstancePropertiesProps) {
  const instance = useStore((s) =>
    s.moduleInstances.find((mi) => mi.id === instanceId),
  );
  const sourceModule = useStore((s) =>
    instance ? s.modules.find((m) => m.id === instance.moduleId) : undefined,
  );
  const updateModuleInstance = useStore((s) => s.updateModuleInstance);
  const removeModuleFromBoard = useStore((s) => s.removeModuleFromBoard);
  const openModuleEditor = useStore((s) => s.openModuleEditor);

  if (!instance) {
    return (
      <div className="module-instance-props">
        <div className="properties-panel__empty">Module instance not found.</div>
      </div>
    );
  }

  function handlePositionChange(axis: 'x' | 'y', value: string) {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    updateModuleInstance(instanceId, {
      ...instance!.transform,
      position: { ...instance!.transform.position, [axis]: num },
    });
  }

  function handleRotationChange(value: string) {
    const rotation = parseInt(value, 10) as Rotation;
    updateModuleInstance(instanceId, {
      ...instance!.transform,
      rotation,
    });
  }

  function handleDetach() {
    // Convert instance to individual components by removing the instance
    removeModuleFromBoard(instanceId);
  }

  return (
    <div className="module-instance-props">
      <div className="properties-panel__section">
        <div className="properties-panel__section-title">Module Instance</div>
        <div className="properties-panel__row">
          <span className="properties-panel__label">Module</span>
          <span className="properties-panel__value">
            {sourceModule?.name ?? 'Unknown'}
          </span>
        </div>
        <div className="properties-panel__row">
          <span className="properties-panel__label">Version</span>
          <span className="module-instance-props__version-badge">
            {instance.moduleVersion}
          </span>
        </div>
        <div className="properties-panel__row">
          <span className="properties-panel__label">Instance ID</span>
          <span className="properties-panel__value" title={instance.id}>
            {instance.id.length > 14 ? `...${instance.id.slice(-12)}` : instance.id}
          </span>
        </div>
      </div>

      <div className="properties-panel__section">
        <div className="properties-panel__section-title">Position</div>
        <div className="properties-panel__row">
          <span className="properties-panel__label">X</span>
          <input
            className="properties-panel__input"
            type="number"
            value={instance.transform.position.x}
            onChange={(e) => handlePositionChange('x', e.target.value)}
          />
        </div>
        <div className="properties-panel__row">
          <span className="properties-panel__label">Y</span>
          <input
            className="properties-panel__input"
            type="number"
            value={instance.transform.position.y}
            onChange={(e) => handlePositionChange('y', e.target.value)}
          />
        </div>
        <div className="properties-panel__row">
          <span className="properties-panel__label">Rotation</span>
          <select
            className="module-instance-props__rotation-select"
            value={instance.transform.rotation}
            onChange={(e) => handleRotationChange(e.target.value)}
          >
            <option value="0">0</option>
            <option value="90">90</option>
            <option value="180">180</option>
            <option value="270">270</option>
          </select>
        </div>
      </div>

      <div className="properties-panel__section">
        <div className="properties-panel__section-title">Overrides</div>
        {Object.keys(instance.overrides).length === 0 ? (
          <div className="module-instance-props__empty">No property overrides</div>
        ) : (
          Object.entries(instance.overrides).map(([key, value]) => (
            <div key={key} className="properties-panel__row">
              <span className="properties-panel__label">{key}</span>
              <span className="properties-panel__value">{value}</span>
            </div>
          ))
        )}
      </div>

      <div className="module-instance-props__actions">
        <button
          className="module-instance-props__action-btn"
          onClick={() => sourceModule && openModuleEditor(sourceModule.id)}
          disabled={!sourceModule}
        >
          Open Source Module
        </button>
        <button
          className="module-instance-props__action-btn module-instance-props__action-btn--danger"
          onClick={handleDetach}
        >
          Detach Module
        </button>
      </div>
    </div>
  );
}
