import { describe, it, expect } from 'vitest';
import {
  createSelectionState,
  select,
  deselect,
  toggleSelect,
  clearSelection,
  selectAll,
  isSelected,
  createMarquee,
  updateMarquee,
  intersectsMarquee,
  getMarqueeBounds,
} from '../selection';

describe('select', () => {
  it('adds an id to the selection set', () => {
    const state = createSelectionState();
    const next = select(state, 'comp_1');
    expect(isSelected(next, 'comp_1')).toBe(true);
    expect(next.selectedIds.size).toBe(1);
  });

  it('sets lastClickedId', () => {
    const state = createSelectionState();
    const next = select(state, 'comp_1');
    expect(next.lastClickedId).toBe('comp_1');
  });

  it('does not duplicate existing ids', () => {
    let state = createSelectionState();
    state = select(state, 'comp_1');
    state = select(state, 'comp_1');
    expect(state.selectedIds.size).toBe(1);
  });
});

describe('deselect', () => {
  it('removes an id from the selection set', () => {
    let state = createSelectionState();
    state = select(state, 'comp_1');
    state = select(state, 'comp_2');
    state = deselect(state, 'comp_1');
    expect(isSelected(state, 'comp_1')).toBe(false);
    expect(isSelected(state, 'comp_2')).toBe(true);
  });

  it('is a no-op for non-existent id', () => {
    const state = createSelectionState();
    const next = deselect(state, 'comp_99');
    expect(next.selectedIds.size).toBe(0);
  });
});

describe('toggleSelect', () => {
  it('adds an unselected id', () => {
    const state = createSelectionState();
    const next = toggleSelect(state, 'comp_1');
    expect(isSelected(next, 'comp_1')).toBe(true);
  });

  it('removes a selected id', () => {
    let state = createSelectionState();
    state = select(state, 'comp_1');
    state = toggleSelect(state, 'comp_1');
    expect(isSelected(state, 'comp_1')).toBe(false);
  });
});

describe('clearSelection', () => {
  it('empties the selection set', () => {
    let state = createSelectionState();
    state = select(state, 'comp_1');
    state = select(state, 'comp_2');
    state = clearSelection(state);
    expect(state.selectedIds.size).toBe(0);
    expect(state.lastClickedId).toBeNull();
  });
});

describe('selectAll', () => {
  it('replaces selection with provided ids', () => {
    let state = createSelectionState();
    state = select(state, 'old_id');
    state = selectAll(state, ['a', 'b', 'c']);
    expect(state.selectedIds.size).toBe(3);
    expect(isSelected(state, 'a')).toBe(true);
    expect(isSelected(state, 'b')).toBe(true);
    expect(isSelected(state, 'c')).toBe(true);
    expect(isSelected(state, 'old_id')).toBe(false);
  });

  it('sets lastClickedId to the last id in the array', () => {
    const state = selectAll(createSelectionState(), ['a', 'b', 'c']);
    expect(state.lastClickedId).toBe('c');
  });

  it('handles empty array', () => {
    const state = selectAll(createSelectionState(), []);
    expect(state.selectedIds.size).toBe(0);
    expect(state.lastClickedId).toBeNull();
  });
});

describe('Marquee', () => {
  it('createMarquee initializes with start point and active state', () => {
    const m = createMarquee({ x: 10, y: 20 });
    expect(m.active).toBe(true);
    expect(m.start).toEqual({ x: 10, y: 20 });
    expect(m.end).toEqual({ x: 10, y: 20 });
  });

  it('updateMarquee changes the end point', () => {
    let m = createMarquee({ x: 0, y: 0 });
    m = updateMarquee(m, { x: 100, y: 200 });
    expect(m.end).toEqual({ x: 100, y: 200 });
    expect(m.start).toEqual({ x: 0, y: 0 });
  });

  it('getMarqueeBounds handles reversed start/end', () => {
    let m = createMarquee({ x: 100, y: 100 });
    m = updateMarquee(m, { x: 0, y: 0 });
    const bounds = getMarqueeBounds(m);
    expect(bounds.min).toEqual({ x: 0, y: 0 });
    expect(bounds.max).toEqual({ x: 100, y: 100 });
  });

  it('intersectsMarquee detects overlapping item', () => {
    let m = createMarquee({ x: 0, y: 0 });
    m = updateMarquee(m, { x: 200, y: 200 });
    const itemBounds = { min: { x: 50, y: 50 }, max: { x: 150, y: 150 } };
    expect(intersectsMarquee(itemBounds, m)).toBe(true);
  });

  it('intersectsMarquee rejects non-overlapping item', () => {
    let m = createMarquee({ x: 0, y: 0 });
    m = updateMarquee(m, { x: 100, y: 100 });
    const itemBounds = { min: { x: 200, y: 200 }, max: { x: 300, y: 300 } };
    expect(intersectsMarquee(itemBounds, m)).toBe(false);
  });

  it('intersectsMarquee detects touching edges', () => {
    let m = createMarquee({ x: 0, y: 0 });
    m = updateMarquee(m, { x: 100, y: 100 });
    const itemBounds = { min: { x: 100, y: 100 }, max: { x: 200, y: 200 } };
    expect(intersectsMarquee(itemBounds, m)).toBe(true);
  });
});
