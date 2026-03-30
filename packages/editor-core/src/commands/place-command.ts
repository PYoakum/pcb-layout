import type { Component } from '@pcb/domain';
import type { Command } from './types';

export interface PlaceCommandArgs {
  component: Component;
  addComponent: (component: Component) => void;
  removeComponent: (id: string) => void;
}

export class PlaceCommand implements Command {
  readonly id: string;
  readonly label: string;

  private component: Component;
  private addComponent: (component: Component) => void;
  private removeComponent: (id: string) => void;

  constructor(args: PlaceCommandArgs) {
    this.id = `place_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.component = args.component;
    this.addComponent = args.addComponent;
    this.removeComponent = args.removeComponent;
    this.label = `Place ${this.component.designator}`;
  }

  execute(): void {
    this.addComponent(this.component);
  }

  undo(): void {
    this.removeComponent(this.component.id);
  }
}
