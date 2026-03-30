import type { Point2D, Component } from '@pcb/domain';
import type { Command } from './types';

export interface MoveCommandArgs {
  components: Component[];
  oldPositions: Map<string, Point2D>;
  newPositions: Map<string, Point2D>;
}

export class MoveCommand implements Command {
  readonly id: string;
  readonly label: string;

  private components: Component[];
  private oldPositions: Map<string, Point2D>;
  private newPositions: Map<string, Point2D>;

  constructor(args: MoveCommandArgs) {
    this.id = `move_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.components = args.components;
    this.oldPositions = args.oldPositions;
    this.newPositions = args.newPositions;

    const count = this.components.length;
    this.label = count === 1
      ? `Move ${this.components[0].designator}`
      : `Move ${count} components`;
  }

  execute(): void {
    for (const comp of this.components) {
      const pos = this.newPositions.get(comp.id);
      if (pos) {
        comp.transform.position = { ...pos };
      }
    }
  }

  undo(): void {
    for (const comp of this.components) {
      const pos = this.oldPositions.get(comp.id);
      if (pos) {
        comp.transform.position = { ...pos };
      }
    }
  }
}
