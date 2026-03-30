import { describe, it, expect } from 'vitest';
import { UndoStack, createHistoryEntry } from '../history';

function entry(action: string, before: number, after: number) {
  return createHistoryEntry(action, before, after);
}

describe('UndoStack', () => {
  it('starts empty with canUndo false and canRedo false', () => {
    const stack = new UndoStack<number>();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
    expect(stack.length).toBe(0);
  });

  it('push adds an entry and updates canUndo', () => {
    const stack = new UndoStack<number>();
    stack.push(entry('set', 0, 1));
    expect(stack.canUndo()).toBe(true);
    expect(stack.length).toBe(1);
  });

  it('undo returns the last entry and moves pointer back', () => {
    const stack = new UndoStack<number>();
    stack.push(entry('a', 0, 1));
    stack.push(entry('b', 1, 2));

    const undone = stack.undo();
    expect(undone).not.toBeNull();
    expect(undone!.action).toBe('b');
    expect(undone!.before).toBe(1);
    expect(undone!.after).toBe(2);
  });

  it('redo returns the entry that was undone', () => {
    const stack = new UndoStack<number>();
    stack.push(entry('a', 0, 1));
    stack.push(entry('b', 1, 2));
    stack.undo();

    const redone = stack.redo();
    expect(redone).not.toBeNull();
    expect(redone!.action).toBe('b');
    expect(redone!.after).toBe(2);
  });

  it('undo at empty stack returns null', () => {
    const stack = new UndoStack<number>();
    expect(stack.undo()).toBeNull();
  });

  it('redo at end of stack returns null', () => {
    const stack = new UndoStack<number>();
    stack.push(entry('a', 0, 1));
    expect(stack.redo()).toBeNull();
  });

  it('new push after undo clears redo stack', () => {
    const stack = new UndoStack<number>();
    stack.push(entry('a', 0, 1));
    stack.push(entry('b', 1, 2));
    stack.push(entry('c', 2, 3));
    stack.undo(); // undo c
    stack.undo(); // undo b

    expect(stack.canRedo()).toBe(true);

    stack.push(entry('d', 1, 4));

    expect(stack.canRedo()).toBe(false);
    expect(stack.length).toBe(2); // a and d
  });

  it('max length trims oldest entries', () => {
    const stack = new UndoStack<number>(3);
    stack.push(entry('a', 0, 1));
    stack.push(entry('b', 1, 2));
    stack.push(entry('c', 2, 3));
    stack.push(entry('d', 3, 4));

    expect(stack.length).toBe(3);

    // Oldest entry 'a' should be gone; undo should yield d, c, b
    const d = stack.undo();
    expect(d!.action).toBe('d');
    const c = stack.undo();
    expect(c!.action).toBe('c');
    const b = stack.undo();
    expect(b!.action).toBe('b');
    expect(stack.undo()).toBeNull();
  });

  it('canUndo and canRedo reflect correct states through undo/redo cycle', () => {
    const stack = new UndoStack<number>();
    stack.push(entry('a', 0, 1));

    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);

    stack.undo();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(true);

    stack.redo();
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);
  });

  it('clear resets the stack', () => {
    const stack = new UndoStack<number>();
    stack.push(entry('a', 0, 1));
    stack.push(entry('b', 1, 2));
    stack.clear();
    expect(stack.length).toBe(0);
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
  });
});
