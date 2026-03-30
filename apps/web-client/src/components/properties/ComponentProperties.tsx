import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { Component, LayerId } from '@pcb/domain';
import { Rotation } from '@pcb/domain';

interface Props {
  component: Component;
}

export function ComponentProperties({ component }: Props) {
  const layers = useStore((s) => s.layers);
  const workspaceConfig = useStore((s) => s.workspaceConfig);
  const clearSelection = useStore((s) => s.clearSelection);

  const step = workspaceConfig?.grid.spacingX ?? 50;

  const [designator, setDesignator] = useState(component.designator);
  const [posX, setPosX] = useState(component.transform.position.x);
  const [posY, setPosY] = useState(component.transform.position.y);
  const [rotation, setRotation] = useState<Rotation>(component.transform.rotation);
  const [layerId, setLayerId] = useState(component.layerId);
  const [locked, setLocked] = useState(component.locked);
  const [properties, setProperties] = useState(
    Object.entries(component.properties),
  );

  useEffect(() => {
    setDesignator(component.designator);
    setPosX(component.transform.position.x);
    setPosY(component.transform.position.y);
    setRotation(component.transform.rotation);
    setLayerId(component.layerId);
    setLocked(component.locked);
    setProperties(Object.entries(component.properties));
  }, [component]);

  const handleDelete = () => {
    clearSelection();
  };

  const updateProperty = (idx: number, key: string, value: string) => {
    const next = [...properties];
    next[idx] = [key, value];
    setProperties(next);
  };

  return (
    <>
      <div className="prop-section">
        <div className="prop-section-title">Identity</div>
        <div className="prop-row">
          <span className="prop-label">Designator</span>
          <input
            className="prop-input"
            type="text"
            value={designator}
            onChange={(e) => setDesignator(e.target.value)}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Name</span>
          <span className="prop-value">{component.name}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">ID</span>
          <span className="prop-value" title={component.id}>
            {component.id.length > 12 ? `...${component.id.slice(-10)}` : component.id}
          </span>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Position</div>
        <div className="prop-row">
          <span className="prop-label">X</span>
          <input
            className="prop-input"
            type="number"
            step={step}
            value={posX}
            onChange={(e) => setPosX(Number(e.target.value))}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Y</span>
          <input
            className="prop-input"
            type="number"
            step={step}
            value={posY}
            onChange={(e) => setPosY(Number(e.target.value))}
          />
        </div>
        <div className="prop-row">
          <span className="prop-label">Rotation</span>
          <select
            className="prop-select"
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value) as Rotation)}
          >
            <option value={Rotation.R0}>0</option>
            <option value={Rotation.R90}>90</option>
            <option value={Rotation.R180}>180</option>
            <option value={Rotation.R270}>270</option>
          </select>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Layer</div>
        <div className="prop-row">
          <span className="prop-label">Layer</span>
          <select
            className="prop-select prop-select--wide"
            value={layerId}
            onChange={(e) => setLayerId(e.target.value as LayerId)}
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Options</div>
        <div className="prop-toggle-row">
          <span className="prop-label">Locked</span>
          <button
            className={`prop-toggle ${locked ? 'prop-toggle--on' : ''}`}
            onClick={() => setLocked(!locked)}
          >
            <span className="prop-toggle__knob" />
          </button>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Custom Properties</div>
        {properties.map(([key, value], i) => (
          <div key={i} className="prop-kv">
            <input
              className="prop-kv__key"
              type="text"
              value={key}
              onChange={(e) => updateProperty(i, e.target.value, value)}
            />
            <input
              className="prop-kv__val"
              type="text"
              value={value}
              onChange={(e) => updateProperty(i, key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Footprint</div>
        <div className="prop-row">
          <span className="prop-label">Name</span>
          <span className="prop-value">{component.footprint.name}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Pads</span>
          <span className="prop-value">{component.footprint.pads.length}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Body</span>
          <span className="prop-value">
            {component.footprint.boundingBox.max.x - component.footprint.boundingBox.min.x}
            {' x '}
            {component.footprint.boundingBox.max.y - component.footprint.boundingBox.min.y}
          </span>
        </div>
      </div>

      <div className="prop-actions">
        <button className="prop-btn prop-btn--danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </>
  );
}
