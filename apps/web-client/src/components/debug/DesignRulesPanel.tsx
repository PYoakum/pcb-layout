import { useState, useMemo } from 'react';
import type { DesignRule, DesignRuleId } from '@pcb/domain';
import { DesignRuleType, createId } from '@pcb/domain';

type RuleCategory = 'clearance' | 'trace' | 'component' | 'other';

function categorizeRule(type: DesignRuleType): RuleCategory {
  switch (type) {
    case DesignRuleType.MinClearance:
    case DesignRuleType.TraceToEdge:
    case DesignRuleType.ComponentToEdge:
      return 'clearance';
    case DesignRuleType.MinTraceWidth:
    case DesignRuleType.MinDrillSize:
    case DesignRuleType.MinAnnularRing:
    case DesignRuleType.MaxViaCount:
      return 'trace';
    default:
      return 'other';
  }
}

const RULE_TYPE_LABELS: Record<DesignRuleType, string> = {
  [DesignRuleType.MinTraceWidth]: 'Min Trace Width',
  [DesignRuleType.MinClearance]: 'Min Clearance',
  [DesignRuleType.MinDrillSize]: 'Min Drill Size',
  [DesignRuleType.MinAnnularRing]: 'Min Annular Ring',
  [DesignRuleType.MaxViaCount]: 'Max Via Count',
  [DesignRuleType.TraceToEdge]: 'Trace to Edge',
  [DesignRuleType.ComponentToEdge]: 'Component to Edge',
};

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  clearance: 'Clearance',
  trace: 'Trace / Via',
  component: 'Component',
  other: 'Other',
};

function RuleRow({
  rule,
  onToggle,
  onUpdate,
  onDelete,
}: {
  rule: DesignRule;
  onToggle: () => void;
  onUpdate: (value: number) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(rule.value));

  const handleCommit = () => {
    const num = parseFloat(editValue);
    if (!isNaN(num) && num >= 0) {
      onUpdate(num);
    }
    setEditing(false);
  };

  return (
    <div className={`rule-row ${!rule.enabled ? 'rule-row--disabled' : ''}`}>
      <input
        type="checkbox"
        className="rule-row__toggle"
        checked={rule.enabled}
        onChange={onToggle}
      />
      <span className="rule-row__name" title={rule.name}>
        {rule.name}
      </span>
      {editing ? (
        <input
          className="rule-row__input"
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommit();
            if (e.key === 'Escape') setEditing(false);
          }}
          autoFocus
        />
      ) : (
        <span
          className="rule-row__value"
          onClick={() => {
            setEditValue(String(rule.value));
            setEditing(true);
          }}
          title="Click to edit"
        >
          {rule.value}
        </span>
      )}
      <span className="rule-row__unit">{rule.unit}</span>
      {rule.netClass && (
        <span className="rule-row__class">{rule.netClass}</span>
      )}
      <button
        className="debug-btn debug-btn--small debug-btn--danger"
        onClick={onDelete}
      >
        Del
      </button>
    </div>
  );
}

export function DesignRulesPanel({
  rules,
  onUpdateRules,
}: {
  rules: DesignRule[];
  onUpdateRules: (rules: DesignRule[]) => void;
}) {
  const [netClassFilter, setNetClassFilter] = useState<string>('all');

  const netClasses = useMemo(() => {
    const classes = new Set<string>();
    for (const r of rules) {
      if (r.netClass) classes.add(r.netClass);
    }
    return Array.from(classes);
  }, [rules]);

  const filteredRules = useMemo(() => {
    if (netClassFilter === 'all') return rules;
    return rules.filter(
      (r) => !r.netClass || r.netClass === netClassFilter
    );
  }, [rules, netClassFilter]);

  const groupedRules = useMemo(() => {
    const groups: Record<RuleCategory, DesignRule[]> = {
      clearance: [],
      trace: [],
      component: [],
      other: [],
    };
    for (const r of filteredRules) {
      const cat = categorizeRule(r.type);
      groups[cat].push(r);
    }
    return groups;
  }, [filteredRules]);

  const handleToggle = (ruleId: string) => {
    onUpdateRules(
      rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleUpdate = (ruleId: string, value: number) => {
    onUpdateRules(
      rules.map((r) => (r.id === ruleId ? { ...r, value } : r))
    );
  };

  const handleDelete = (ruleId: string) => {
    onUpdateRules(rules.filter((r) => r.id !== ruleId));
  };

  const handleAddRule = (type: DesignRuleType) => {
    const newRule: DesignRule = {
      id: createId<DesignRuleId>('dr'),
      type,
      name: RULE_TYPE_LABELS[type],
      value: 6,
      unit: 'mil',
      enabled: true,
    };
    onUpdateRules([...rules, newRule]);
  };

  const handleRestoreDefaults = () => {
    // Import defaults from rules engine would be ideal, but we inline the standard set
    const defaults: DesignRule[] = [
      { id: createId<DesignRuleId>('dr'), type: DesignRuleType.MinTraceWidth, name: 'Minimum Trace Width', value: 6, unit: 'mil', enabled: true },
      { id: createId<DesignRuleId>('dr'), type: DesignRuleType.MinClearance, name: 'Minimum Clearance', value: 6, unit: 'mil', enabled: true },
      { id: createId<DesignRuleId>('dr'), type: DesignRuleType.MinDrillSize, name: 'Minimum Drill Size', value: 10, unit: 'mil', enabled: true },
      { id: createId<DesignRuleId>('dr'), type: DesignRuleType.MinAnnularRing, name: 'Minimum Annular Ring', value: 5, unit: 'mil', enabled: true },
      { id: createId<DesignRuleId>('dr'), type: DesignRuleType.TraceToEdge, name: 'Trace to Board Edge', value: 10, unit: 'mil', enabled: true },
      { id: createId<DesignRuleId>('dr'), type: DesignRuleType.ComponentToEdge, name: 'Component to Board Edge', value: 10, unit: 'mil', enabled: true },
    ];
    onUpdateRules(defaults);
  };

  return (
    <div className="debug-panel rules-panel">
      <div className="debug-panel__toolbar">
        <select
          className="debug-select"
          value={netClassFilter}
          onChange={(e) => setNetClassFilter(e.target.value)}
        >
          <option value="all">All Net Classes</option>
          {netClasses.map((nc) => (
            <option key={nc} value={nc}>
              {nc}
            </option>
          ))}
        </select>

        <select
          className="debug-select"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              handleAddRule(e.target.value as DesignRuleType);
              e.target.value = '';
            }
          }}
        >
          <option value="" disabled>
            + Add Rule
          </option>
          {Object.values(DesignRuleType).map((t) => (
            <option key={t} value={t}>
              {RULE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <button className="debug-btn" onClick={handleRestoreDefaults}>
          Defaults
        </button>
      </div>

      <div className="rules-panel__list">
        {(Object.keys(groupedRules) as RuleCategory[]).map((cat) => {
          const catRules = groupedRules[cat];
          if (catRules.length === 0) return null;
          return (
            <div key={cat} className="rules-category">
              <div className="rules-category__header">{CATEGORY_LABELS[cat]}</div>
              {catRules.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  onToggle={() => handleToggle(rule.id)}
                  onUpdate={(val) => handleUpdate(rule.id, val)}
                  onDelete={() => handleDelete(rule.id)}
                />
              ))}
            </div>
          );
        })}

        {filteredRules.length === 0 && (
          <div className="debug-empty">No design rules configured.</div>
        )}
      </div>
    </div>
  );
}
