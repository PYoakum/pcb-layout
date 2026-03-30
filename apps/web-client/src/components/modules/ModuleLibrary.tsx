import { useState } from 'react';
import { useStore } from '../../store';
import type { Module, ModuleId } from '@pcb/domain';

export function ModuleLibrary() {
  const modules = useStore((s) => s.modules);
  const loadingModules = useStore((s) => s.loadingModules);
  const openModuleEditor = useStore((s) => s.openModuleEditor);
  const deleteModule = useStore((s) => s.deleteModule);
  const addModuleToBoard = useStore((s) => s.addModuleToBoard);
  const saveModule = useStore((s) => s.saveModule);

  const [search, setSearch] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<ModuleId | null>(null);

  const filtered = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  function handleDragStart(e: React.DragEvent, mod: Module) {
    e.dataTransfer.setData('application/pcb-module-id', mod.id);
    e.dataTransfer.effectAllowed = 'copy';
  }

  function handleDuplicate(mod: Module) {
    const now = new Date().toISOString();
    const dup: Module = {
      ...mod,
      id: `mod_${crypto.randomUUID()}` as ModuleId,
      name: `${mod.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    saveModule(dup);
  }

  function handleModuleClick(mod: Module) {
    setSelectedModuleId(mod.id === selectedModuleId ? null : mod.id);
  }

  function handlePlaceSelected() {
    if (selectedModuleId) {
      addModuleToBoard(selectedModuleId, { x: 250, y: 250 });
    }
  }

  if (modules.length === 0 && !loadingModules) {
    return (
      <div className="module-library">
        <div className="module-library__header">
          <button
            className="module-library__new-btn"
            onClick={() => openModuleEditor(null)}
          >
            + New Module
          </button>
        </div>
        <div className="module-library__empty">
          <span className="module-library__empty-icon">&#9645;</span>
          <span>No modules yet.</span>
          <span>Create your first module to build reusable circuit blocks.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="module-library">
      <div className="module-library__header">
        <input
          className="module-library__search"
          type="text"
          placeholder="Filter modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="module-library__new-btn"
          onClick={() => openModuleEditor(null)}
          title="Create new module"
        >
          +
        </button>
      </div>

      {loadingModules && (
        <div className="module-library__loading">Loading...</div>
      )}

      <div className="module-library__list">
        {filtered.map((mod) => (
          <div
            key={mod.id}
            className={`module-library__item ${
              selectedModuleId === mod.id ? 'module-library__item--selected' : ''
            }`}
            onClick={() => handleModuleClick(mod)}
            draggable
            onDragStart={(e) => handleDragStart(e, mod)}
          >
            <div className="module-library__item-main">
              <span className="module-library__item-name">{mod.name}</span>
              <span className="module-library__version-badge">{mod.version}</span>
            </div>
            <div className="module-library__item-meta">
              <span>{mod.components.length} components</span>
              {mod.exposedPins.length > 0 && (
                <span>{mod.exposedPins.length} pins</span>
              )}
            </div>
            <div className="module-library__item-actions">
              <button
                className="module-library__action-btn"
                title="Edit module"
                onClick={(e) => {
                  e.stopPropagation();
                  openModuleEditor(mod.id);
                }}
              >
                Edit
              </button>
              <button
                className="module-library__action-btn"
                title="Duplicate module"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate(mod);
                }}
              >
                Dup
              </button>
              <button
                className="module-library__action-btn module-library__action-btn--danger"
                title="Delete module"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteModule(mod.id);
                }}
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedModuleId && (
        <div className="module-library__footer">
          <button
            className="module-library__place-btn"
            onClick={handlePlaceSelected}
          >
            Place on Board
          </button>
        </div>
      )}
    </div>
  );
}
