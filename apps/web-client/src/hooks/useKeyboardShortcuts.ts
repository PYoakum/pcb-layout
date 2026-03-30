import { useEffect } from 'react';
import { useStore } from '../store';

/**
 * Global keyboard shortcuts for the PCB editor.
 * Should be mounted once at the app or editor layout level.
 *
 * Shortcuts are only active when no input/textarea is focused.
 */
export function useKeyboardShortcuts() {
  const setActiveTool = useStore((s) => s.setActiveTool);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const toggleSnap = useStore((s) => s.toggleSnap);
  const selectedIds = useStore((s) => s.selectedIds);
  const clearSelection = useStore((s) => s.clearSelection);
  const setSelectedIds = useStore((s) => s.setSelectedIds);
  const components = useStore((s) => s.components);
  const activeTool = useStore((s) => s.activeTool);

  useEffect(() => {
    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key;

      // ---- Tool shortcuts ----

      if (!ctrl && !shift) {
        switch (key) {
          case 'v':
          case '1':
            e.preventDefault();
            setActiveTool('select');
            return;
          case 'p':
          case '2':
            e.preventDefault();
            setActiveTool('place');
            return;
          case 't':
          case '3':
            e.preventDefault();
            setActiveTool('trace');
            return;
          case 'h':
          case '4':
            e.preventDefault();
            setActiveTool('pan');
            return;
          case 'm':
          case '5':
            e.preventDefault();
            setActiveTool('measure');
            return;
        }
      }

      // ---- Toggle shortcuts ----
      if (!ctrl && !shift && key === 'g') {
        e.preventDefault();
        toggleGrid();
        return;
      }

      if (!ctrl && !shift && key === 's') {
        e.preventDefault();
        toggleSnap();
        return;
      }

      // ---- Escape: cancel / deselect ----
      if (key === 'Escape') {
        e.preventDefault();
        clearSelection();
        // The EditorController also listens for Escape via the InteractionManager,
        // so tool-specific cancellation is handled there.
        return;
      }

      // ---- Ctrl+A: select all ----
      if (ctrl && key === 'a') {
        e.preventDefault();
        const allIds = components.map((c) => c.id);
        setSelectedIds(allIds);
        return;
      }

      // ---- Ctrl+Z: undo ----
      // ---- Ctrl+Shift+Z or Ctrl+Y: redo ----
      // Undo/redo is handled by the EditorController through the InteractionManager
      // keydown events. The controller manages command history directly.
      // We re-dispatch here as well for cases where the canvas doesn't have focus.

      // ---- Ctrl+D: duplicate ----
      // Handled by EditorController via key events forwarded from InteractionManager.

      // Note: R (rotate), Delete/Backspace (delete) are forwarded to the active
      // tool by the InteractionManager -> EditorController pipeline, so they don't
      // need separate handling here.
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setActiveTool,
    toggleGrid,
    toggleSnap,
    selectedIds,
    clearSelection,
    setSelectedIds,
    components,
    activeTool,
  ]);
}
