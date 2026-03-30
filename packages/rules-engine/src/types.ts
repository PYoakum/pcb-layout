import type {
  Board,
  Component,
  Net,
  TracePath,
  DesignRule,
  DesignRuleViolation,
} from '@pcb/domain';

export interface ValidationContext {
  board: Board;
  components: Component[];
  nets: Net[];
  paths: TracePath[];
  rules: DesignRule[];
}

export interface ValidationResult {
  valid: boolean;
  violations: DesignRuleViolation[];
  warnings: DesignRuleViolation[];
  checkedRules: number;
  timestamp: string;
}

export interface RuleChecker {
  name: string;
  check(context: ValidationContext): DesignRuleViolation[];
}
