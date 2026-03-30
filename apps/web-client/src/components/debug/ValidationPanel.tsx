import { useState, useMemo } from 'react';
import { useStore } from '../../store';
import type { ValidationResult } from '@pcb/api-contracts';

type SeverityFilter = 'all' | 'error' | 'warning' | 'info';
type RuleFilter = 'all' | 'clearance' | 'trace' | 'component' | 'net' | 'alignment';

function classifyRule(rule: string): RuleFilter {
  const r = rule.toLowerCase();
  if (r.includes('clearance') || r.includes('edge')) return 'clearance';
  if (r.includes('trace') || r.includes('width') || r.includes('via') || r.includes('drill') || r.includes('annular')) return 'trace';
  if (r.includes('component') || r.includes('pad') || r.includes('overlap') || r.includes('bounds')) return 'component';
  if (r.includes('net') || r.includes('pin') || r.includes('short') || r.includes('float') || r.includes('connect')) return 'net';
  if (r.includes('align') || r.includes('grid') || r.includes('boundary') || r.includes('rotation')) return 'alignment';
  return 'all';
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'error') return <span className="debug-severity debug-severity--error" title="Error">!!</span>;
  if (severity === 'warning') return <span className="debug-severity debug-severity--warning" title="Warning">!</span>;
  return <span className="debug-severity debug-severity--info" title="Info">i</span>;
}

export function ValidationPanel() {
  const validationResults = useStore((s) => s.validationResults);
  const validating = useStore((s) => s.validating);
  const autoValidate = useStore((s) => s.autoValidate);
  const runValidation = useStore((s) => s.runValidation);
  const clearValidation = useStore((s) => s.clearValidation);
  const setAutoValidate = useStore((s) => s.setAutoValidate);
  const highlightViolation = useStore((s) => s.highlightViolation);
  const currentBoard = useStore((s) => s.currentBoard);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>('all');

  const filteredResults = useMemo(() => {
    if (!validationResults) return [];
    return validationResults.results.filter((r) => {
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
      if (ruleFilter !== 'all' && classifyRule(r.rule) !== ruleFilter) return false;
      return true;
    });
  }, [validationResults, severityFilter, ruleFilter]);

  const handleRunValidation = () => {
    if (currentBoard) {
      runValidation(currentBoard.id);
    }
  };

  const handleClickViolation = (result: ValidationResult) => {
    const entityId = result.location?.entityId;
    highlightViolation(entityId ? [entityId] : []);
  };

  return (
    <div className="debug-panel validation-panel">
      <div className="debug-panel__toolbar">
        <button
          className="debug-btn debug-btn--primary"
          onClick={handleRunValidation}
          disabled={validating || !currentBoard}
        >
          {validating ? 'Validating...' : 'Run Validation'}
        </button>
        {validationResults && (
          <button className="debug-btn" onClick={clearValidation}>
            Clear
          </button>
        )}
        <label className="debug-toggle">
          <input
            type="checkbox"
            checked={autoValidate}
            onChange={(e) => setAutoValidate(e.target.checked)}
          />
          <span>Auto</span>
        </label>
      </div>

      {validationResults && (
        <>
          <div className="validation-summary">
            <span className="validation-summary__item validation-summary__item--error">
              {validationResults.errorCount} errors
            </span>
            <span className="validation-summary__item validation-summary__item--warning">
              {validationResults.warningCount} warnings
            </span>
            <span className="validation-summary__item">
              {validationResults.checkedRules} checked
            </span>
            <span className="validation-summary__timestamp">
              {new Date(validationResults.checkedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="validation-filters">
            <div className="validation-filters__group">
              {(['all', 'error', 'warning', 'info'] as SeverityFilter[]).map((f) => (
                <button
                  key={f}
                  className={`debug-filter-btn ${severityFilter === f ? 'debug-filter-btn--active' : ''}`}
                  onClick={() => setSeverityFilter(f)}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="validation-filters__group">
              <select
                className="debug-select"
                value={ruleFilter}
                onChange={(e) => setRuleFilter(e.target.value as RuleFilter)}
              >
                <option value="all">All Rules</option>
                <option value="clearance">Clearance</option>
                <option value="trace">Trace</option>
                <option value="component">Component</option>
                <option value="net">Net</option>
                <option value="alignment">Alignment</option>
              </select>
            </div>
          </div>

          <div className="validation-list">
            {filteredResults.length === 0 ? (
              <div className="debug-empty">
                {validationResults.results.length === 0
                  ? 'No violations found.'
                  : 'No results match current filters.'}
              </div>
            ) : (
              filteredResults.map((result, idx) => (
                <div
                  key={idx}
                  className="validation-row"
                  onClick={() => handleClickViolation(result)}
                >
                  <SeverityIcon severity={result.severity} />
                  <div className="validation-row__content">
                    <div className="validation-row__message">{result.message}</div>
                    <div className="validation-row__meta">
                      <span className="validation-row__rule">{result.rule}</span>
                      {result.location && (
                        <span className="validation-row__entity">
                          {result.location.entityType}:{' '}
                          {result.location.entityId.length > 12
                            ? `...${result.location.entityId.slice(-10)}`
                            : result.location.entityId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {!validationResults && !validating && (
        <div className="debug-empty">
          Click "Run Validation" to check the board against design rules.
        </div>
      )}

      {validating && (
        <div className="debug-empty">
          <span className="debug-spinner" />
          Running validation checks...
        </div>
      )}
    </div>
  );
}
