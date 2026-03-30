import type { Point2D, BoundingBox } from '@pcb/domain';

export interface SelectionState {
  selectedIds: Set<string>;
  hoveredId: string | null;
  lastClickedId: string | null;
}

export function createSelectionState(): SelectionState {
  return {
    selectedIds: new Set(),
    hoveredId: null,
    lastClickedId: null,
  };
}

export function select(state: SelectionState, id: string): SelectionState {
  const next = new Set(state.selectedIds);
  next.add(id);
  return { ...state, selectedIds: next, lastClickedId: id };
}

export function deselect(state: SelectionState, id: string): SelectionState {
  const next = new Set(state.selectedIds);
  next.delete(id);
  return { ...state, selectedIds: next };
}

export function toggleSelect(state: SelectionState, id: string): SelectionState {
  return state.selectedIds.has(id) ? deselect(state, id) : select(state, id);
}

export function selectAll(state: SelectionState, ids: string[]): SelectionState {
  return { ...state, selectedIds: new Set(ids), lastClickedId: ids[ids.length - 1] ?? null };
}

export function clearSelection(state: SelectionState): SelectionState {
  return { ...state, selectedIds: new Set(), lastClickedId: null };
}

export function isSelected(state: SelectionState, id: string): boolean {
  return state.selectedIds.has(id);
}

export function getSelectedIds(state: SelectionState): string[] {
  return Array.from(state.selectedIds);
}

export function setHovered(state: SelectionState, id: string | null): SelectionState {
  return { ...state, hoveredId: id };
}

// Marquee / rectangle selection

export interface MarqueeState {
  active: boolean;
  start: Point2D;
  end: Point2D;
}

export function createMarquee(start: Point2D): MarqueeState {
  return { active: true, start, end: { ...start } };
}

export function updateMarquee(marquee: MarqueeState, end: Point2D): MarqueeState {
  return { ...marquee, end };
}

export function finalizeMarquee(marquee: MarqueeState): MarqueeState {
  return { ...marquee, active: false };
}

export function getMarqueeBounds(marquee: MarqueeState): BoundingBox {
  return {
    min: {
      x: Math.min(marquee.start.x, marquee.end.x),
      y: Math.min(marquee.start.y, marquee.end.y),
    },
    max: {
      x: Math.max(marquee.start.x, marquee.end.x),
      y: Math.max(marquee.start.y, marquee.end.y),
    },
  };
}

/** Check if a bounding box intersects the marquee region */
export function intersectsMarquee(itemBounds: BoundingBox, marquee: MarqueeState): boolean {
  const m = getMarqueeBounds(marquee);
  return (
    itemBounds.min.x <= m.max.x &&
    itemBounds.max.x >= m.min.x &&
    itemBounds.min.y <= m.max.y &&
    itemBounds.max.y >= m.min.y
  );
}
