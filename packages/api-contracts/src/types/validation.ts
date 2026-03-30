export interface ValidationRequest {
  rules?: string[]; // optional subset of rule names to check
}

export interface ValidationResult {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    entityType: string;
    entityId: string;
    details?: string;
  };
}

export interface ValidationResponse {
  data: {
    valid: boolean;
    results: ValidationResult[];
    checkedAt: string;
  };
}
