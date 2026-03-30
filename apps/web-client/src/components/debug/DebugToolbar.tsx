import { useStore } from '../../store';

type DebugTab = 'validation' | 'nets' | 'rules';

const TAB_LABELS: Record<DebugTab, string> = {
  validation: 'Validation',
  nets: 'Nets',
  rules: 'Design Rules',
};

export function DebugToolbar() {
  const debugPanelOpen = useStore((s) => s.debugPanelOpen);
  const debugActiveTab = useStore((s) => s.debugActiveTab);
  const setDebugPanelOpen = useStore((s) => s.setDebugPanelOpen);
  const setDebugActiveTab = useStore((s) => s.setDebugActiveTab);
  const validationResults = useStore((s) => s.validationResults);
  const runValidation = useStore((s) => s.runValidation);
  const validating = useStore((s) => s.validating);
  const currentBoard = useStore((s) => s.currentBoard);

  const errorCount = validationResults?.errorCount ?? 0;
  const warningCount = validationResults?.warningCount ?? 0;

  const handleTabClick = (tab: DebugTab) => {
    if (debugActiveTab === tab && debugPanelOpen) {
      setDebugPanelOpen(false);
    } else {
      setDebugActiveTab(tab);
    }
  };

  const handleQuickValidation = () => {
    if (currentBoard && !validating) {
      runValidation(currentBoard.id);
      setDebugActiveTab('validation');
    }
  };

  return (
    <div className="debug-toolbar">
      <div className="debug-toolbar__tabs">
        {(Object.keys(TAB_LABELS) as DebugTab[]).map((tab) => (
          <button
            key={tab}
            className={`debug-toolbar__tab ${
              debugActiveTab === tab && debugPanelOpen
                ? 'debug-toolbar__tab--active'
                : ''
            }`}
            onClick={() => handleTabClick(tab)}
          >
            {TAB_LABELS[tab]}
            {tab === 'validation' && errorCount > 0 && (
              <span className="debug-badge debug-badge--error">{errorCount}</span>
            )}
            {tab === 'validation' && warningCount > 0 && errorCount === 0 && (
              <span className="debug-badge debug-badge--warning">{warningCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="debug-toolbar__actions">
        <button
          className="debug-btn debug-btn--small"
          onClick={handleQuickValidation}
          disabled={validating || !currentBoard}
          title="Quick validation check"
        >
          {validating ? '...' : 'Check'}
        </button>
        <button
          className="debug-btn debug-btn--small"
          onClick={() => setDebugPanelOpen(!debugPanelOpen)}
          title={debugPanelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {debugPanelOpen ? '\u25BC' : '\u25B2'}
        </button>
      </div>
    </div>
  );
}
