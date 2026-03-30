import type { Rotation, Component } from '@pcb/domain';
import type { Command } from './types';

export interface RotateCommandArgs {
  components: Component[];
  oldRotations: Map<string, Rotation>;
  newRotations: Map<string, Rotation>;
}

export class RotateCommand implements Command {
  readonly id: string;
  readonly label: string;

  private components: Component[];
  private oldRotations: Map<string, Rotation>;
  private newRotations: Map<string, Rotation>;

  constructor(args: RotateCommandArgs) {
    this.id = `rotate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.components = args.components;
    this.oldRotations = args.oldRotations;
    this.newRotations = args.newRotations;

    const count = this.components.length;
    this.label = count === 1
      ? `Rotate ${this.components[0].designator}`
      : `Rotate ${count} components`;
  }

  execute(): void {
    for (const comp of this.components) {
      const rot = this.newRotations.get(comp.id);
      if (rot !== undefined) {
        comp.transform.rotation = rot;
      }
    }
  }

  undo(): void {
    for (const comp of this.components) {
      const rot = this.oldRotations.get(comp.id);
      if (rot !== undefined) {
        comp.transform.rotation = rot;
      }
    }
  }
}
