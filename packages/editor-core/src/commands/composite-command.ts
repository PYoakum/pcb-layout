import type { Command } from './types';

export class CompositeCommand implements Command {
  readonly id: string;
  readonly label: string;

  private commands: Command[];

  constructor(label: string, commands: Command[]) {
    this.id = `composite_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.label = label;
    this.commands = commands;
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
