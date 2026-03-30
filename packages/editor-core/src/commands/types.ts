export interface Command {
  id: string;
  label: string;
  execute(): void;
  undo(): void;
}
