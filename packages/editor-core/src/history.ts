export interface HistoryEntry<T = unknown> {
  action: string;
  before: T;
  after: T;
  timestamp: number;
}

export class UndoStack<T = unknown> {
  private stack: HistoryEntry<T>[] = [];
  private pointer = -1;
  private maxLength: number;

  constructor(maxLength = 100) {
    this.maxLength = maxLength;
  }

  push(entry: HistoryEntry<T>): void {
    // Discard any redo entries beyond the pointer
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(entry);

    // Trim oldest entries if over capacity
    if (this.stack.length > this.maxLength) {
      const excess = this.stack.length - this.maxLength;
      this.stack = this.stack.slice(excess);
    }

    this.pointer = this.stack.length - 1;
  }

  undo(): HistoryEntry<T> | null {
    if (!this.canUndo()) return null;
    const entry = this.stack[this.pointer];
    this.pointer--;
    return entry;
  }

  redo(): HistoryEntry<T> | null {
    if (!this.canRedo()) return null;
    this.pointer++;
    return this.stack[this.pointer];
  }

  canUndo(): boolean {
    return this.pointer >= 0;
  }

  canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  clear(): void {
    this.stack = [];
    this.pointer = -1;
  }

  get length(): number {
    return this.stack.length;
  }

  get currentIndex(): number {
    return this.pointer;
  }
}

export function createHistoryEntry<T>(action: string, before: T, after: T): HistoryEntry<T> {
  return { action, before, after, timestamp: Date.now() };
}
