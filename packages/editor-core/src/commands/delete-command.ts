import type { Component } from '@pcb/domain';
import type { Command } from './types';

export interface DeleteCommandArgs {
  components: Component[];
  addComponent: (component: Component) => void;
  removeComponent: (id: string) => void;
}

export class DeleteCommand implements Command {
  readonly id: string;
  readonly label: string;

  private components: Component[];
  private addComponent: (component: Component) => void;
  private removeComponent: (id: string) => void;

  constructor(args: DeleteCommandArgs) {
    this.id = `delete_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.components = args.components;
    this.addComponent = args.addComponent;
    this.removeComponent = args.removeComponent;

    const count = this.components.length;
    this.label = count === 1
      ? `Delete ${this.components[0].designator}`
      : `Delete ${count} components`;
  }

  execute(): void {
    for (const comp of this.components) {
      this.removeComponent(comp.id);
    }
  }

  undo(): void {
    for (const comp of this.components) {
      this.addComponent(comp);
    }
  }
}
