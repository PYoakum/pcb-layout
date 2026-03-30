import { DesignRuleId } from './ids';

export enum DesignRuleType {
  MinTraceWidth = 'min_trace_width',
  MinClearance = 'min_clearance',
  MinDrillSize = 'min_drill_size',
  MinAnnularRing = 'min_annular_ring',
  MaxViaCount = 'max_via_count',
  TraceToEdge = 'trace_to_edge',
  ComponentToEdge = 'component_to_edge',
}

export interface DesignRule {
  id: DesignRuleId;
  type: DesignRuleType;
  name: string;
  value: number;
  unit: string;
  netClass?: string;   // applies to specific net class, or all if undefined
  enabled: boolean;
}

export interface DesignRuleViolation {
  ruleId: DesignRuleId;
  entityIds: string[];
  message: string;
  severity: 'warning' | 'error';
  location?: { x: number; y: number };
}
