import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { Module, ExposedPin, ComponentId } from '@pcb/domain';

interface ExposedPinRow extends ExposedPin {
  key: string;
}

export function ModuleEditor() {
  const editingModule = useStore((s) => s.editingModule);
  const moduleEditorOpen = useStore((s) => s.moduleEditorOpen);
  const closeModuleEditor = useStore((s) => s.closeModuleEditor);
  const saveModule = useStore((s) => s.saveModule);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [components, setComponents] = useState<ComponentId[]>([]);
  const [exposedPins, setExposedPins] = useState<ExposedPinRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (editingModule) {
      setName(editingModule.name);
      setDescription(editingModule.description);
      setVersion(editingModule.version);
      setCategory(editingModule.category);
      setTags(editingModule.tags.join(', '));
      setComponents([...editingModule.components]);
      setExposedPins(
        editingModule.exposedPins.map((p, i) => ({
          ...p,
          key: `pin_${i}_${Date.now()}`,
        })),
      );
      setValidationErrors([]);
    }
  }, [editingModule]);

  if (!moduleEditorOpen || !editingModule) return null;

  function validate(): string[] {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Module name is required');
    if (!version.trim()) errors.push('Version is required');
    if (version.trim() && !/^\d+\.\d+\.\d+/.test(version.trim())) {
      errors.push('Version must follow semver format (e.g., 1.0.0)');
    }
    return errors;
  }

  function handleSave() {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const updated: Module = {
      ...editingModule!,
      name: name.trim(),
      description: description.trim(),
      version: version.trim(),
      category: category.trim() || 'uncategorized',
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      components,
      exposedPins: exposedPins.map(({ key: _key, ...pin }) => pin),
      updatedAt: new Date().toISOString(),
    };
    saveModule(updated);
  }

  function addExposedPin() {
    setExposedPins((prev) => [
      ...prev,
      {
        pinId: '',
        externalName: `PIN_${prev.length + 1}`,
        key: `pin_${Date.now()}`,
      },
    ]);
  }

  function updateExposedPin(key: string, field: keyof ExposedPin, value: string) {
    setExposedPins((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)),
    );
  }

  function removeExposedPin(key: string) {
    setExposedPins((prev) => prev.filter((p) => p.key !== key));
  }

  function addComponent() {
    const newId = `comp_placeholder_${Date.now()}` as ComponentId;
    setComponents((prev) => [...prev, newId]);
  }

  function removeComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="module-editor__overlay" onClick={closeModuleEditor}>
      <div className="module-editor" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="module-editor__header">
          <input
            className="module-editor__name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Module name"
          />
          <div className="module-editor__header-right">
            <label className="module-editor__version-label">
              v
              <input
                className="module-editor__version-input"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="0.1.0"
              />
            </label>
            <button className="module-editor__close-btn" onClick={closeModuleEditor}>
              X
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="module-editor__body">
          {/* Description */}
          <div className="module-editor__section">
            <div className="module-editor__section-title">Description</div>
            <textarea
              className="module-editor__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this module..."
              rows={3}
            />
          </div>

          {/* Category & Tags */}
          <div className="module-editor__section">
            <div className="module-editor__section-title">Organization</div>
            <div className="module-editor__form-row">
              <label className="module-editor__label">Category</label>
              <input
                className="module-editor__input"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., power, interface"
              />
            </div>
            <div className="module-editor__form-row">
              <label className="module-editor__label">Tags</label>
              <input
                className="module-editor__input"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated tags"
              />
            </div>
          </div>

          {/* Components */}
          <div className="module-editor__section">
            <div className="module-editor__section-header">
              <span className="module-editor__section-title">
                Components ({components.length})
              </span>
              <button className="module-editor__add-btn" onClick={addComponent}>
                + Add
              </button>
            </div>
            {components.length === 0 ? (
              <div className="module-editor__empty">No components added</div>
            ) : (
              <div className="module-editor__list">
                {components.map((compId, i) => (
                  <div key={`${compId}_${i}`} className="module-editor__list-item">
                    <span className="module-editor__comp-id" title={compId}>
                      {compId.length > 20 ? `...${compId.slice(-18)}` : compId}
                    </span>
                    <button
                      className="module-editor__remove-btn"
                      onClick={() => removeComponent(i)}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exposed Pins */}
          <div className="module-editor__section">
            <div className="module-editor__section-header">
              <span className="module-editor__section-title">
                Exposed Pins ({exposedPins.length})
              </span>
              <button className="module-editor__add-btn" onClick={addExposedPin}>
                + Add
              </button>
            </div>
            {exposedPins.length === 0 ? (
              <div className="module-editor__empty">No exposed pins</div>
            ) : (
              <div className="module-editor__list">
                {exposedPins.map((pin) => (
                  <div key={pin.key} className="module-editor__pin-row">
                    <input
                      className="module-editor__pin-input"
                      type="text"
                      value={pin.pinId}
                      onChange={(e) => updateExposedPin(pin.key, 'pinId', e.target.value)}
                      placeholder="Internal pin ID"
                    />
                    <input
                      className="module-editor__pin-input"
                      type="text"
                      value={pin.externalName}
                      onChange={(e) =>
                        updateExposedPin(pin.key, 'externalName', e.target.value)
                      }
                      placeholder="External name"
                    />
                    <button
                      className="module-editor__remove-btn"
                      onClick={() => removeExposedPin(pin.key)}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Module Preview */}
          <div className="module-editor__section">
            <div className="module-editor__section-title">Preview</div>
            <div className="module-editor__preview">
              <div className="module-editor__preview-box">
                <span className="module-editor__preview-label">{name || 'Module'}</span>
                <span className="module-editor__preview-meta">
                  {components.length} comp / {exposedPins.length} pins
                </span>
              </div>
            </div>
          </div>

          {/* Validation Status */}
          {validationErrors.length > 0 && (
            <div className="module-editor__validation">
              {validationErrors.map((err, i) => (
                <div key={i} className="module-editor__validation-error">
                  {err}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="module-editor__footer">
          <button className="module-editor__cancel-btn" onClick={closeModuleEditor}>
            Cancel
          </button>
          <button className="module-editor__save-btn" onClick={handleSave}>
            Save Module
          </button>
        </div>
      </div>
    </div>
  );
}
